// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {FixedPointMathLib as FPM} from "solady/utils/FixedPointMathLib.sol";

/// @title WAB: live 1v1 prediction markets on AI fighters.
/// @notice Each match is a binary market. A share of a fighter pays 1 MON if that fighter wins and 0 if it
/// loses, so a fighter's price (0..1 MON) is the market's probability that it wins. Prices come from a
/// logarithmic market scoring rule (LMSR) market maker funded by a house bankroll, which is always solvent:
/// a trade is refused if the match could not pay every winning share.
///
/// Match flow (best of 3 audience-voted rounds):
///   1. Start: trading opens at 50/50.
///   2-4. Rounds (elevator pitch, aspects, MVP): trading closes while the fighters work, position holders
///        vote on blind pitches, the round is resolved, the price is reset to the fighter's chance of
///        winning the match, and trading reopens.
///   5. Result: the first fighter to win 2 rounds wins; winning shares are claimable for 1 MON each.
contract WAB {
    // ---------------------------------------------------------------- types

    enum Phase {
        None,
        Open, // trading until tradeEnd, then the fighters work (trading closed) until openVoting
        Voting, // position holders vote on the current round's blind pitches
        Resolved,
        Cancelled
    }

    struct WeightClass {
        uint96 minTrade; // smallest buy, in wei
        uint96 maxTrade; // largest single buy, in wei
        uint96 bankroll; // house MON locked per match, in wei
        uint96 liquidity; // LMSR b, in wei: larger = prices move less per trade
        uint16 feeBps; // fee at a 50/50 price; scales with p(1-p) like Polymarket's taker fee
        uint32 tradeWindow; // seconds trading stays open after each round
        uint32 voteDuration;
        uint32 settleGrace; // seconds the operator has to act before anyone can cancel
        bool active;
        bytes32 configHash;
    }

    struct Fighter {
        address owner;
        uint8 classId;
        uint32 wins;
        uint32 losses;
        bytes32 profileHash;
    }

    struct Match {
        uint8 classId;
        Phase phase;
        uint8 round; // rounds resolved so far (0..3); the round being fought/voted is round + 1
        uint8 winsA;
        uint8 winsB;
        uint8 winner; // 0 = fighter A, 1 = fighter B (valid when Resolved)
        uint32 fighterA;
        uint32 fighterB;
        uint40 tradeEnd;
        uint40 voteEnd;
        uint40 deadline; // after this, anyone can cancel a stalled match
        int128 anchor; // price offset in log-odds (wad), reset after each round
        uint64 roundOdds; // fighter A's chance of winning any one round (wad), from both fighters' records
        uint128 sharesA; // outstanding shares (wei; 1e18 = pays 1 MON)
        uint128 sharesB;
        uint128 pool; // MON backing the shares: bankroll + buys - sells
        uint128 fees; // fees taken in this match, released to the house at the end
        uint128 refundOwed; // sum over traders of max(0, paid - received), for cancellations
        uint128 refundFunds; // MON set aside for refunds when cancelled
        bytes32 taskHash;
        bytes32 revealCommit; // commits the current round's blind labels and tie-break
        bytes32 pitchesHash;
        // class parameters snapshotted at creation
        uint96 minTrade;
        uint96 maxTrade;
        uint96 liquidity;
        uint16 feeBps;
        uint32 tradeWindow;
        uint32 voteDuration;
        uint32 settleGrace;
    }

    struct Position {
        uint128 sharesA;
        uint128 sharesB;
        uint128 paid; // MON sent in, fees included
        uint128 received; // MON paid out by sells
        bool settled; // claimed or refunded
    }

    // ------------------------------------------------------------ constants

    uint8 public constant ROUNDS_TO_WIN = 2;
    uint40 public constant MAX_FIGHT_SECONDS = 600;
    uint16 public constant MAX_FEE_BPS = 1000;
    int256 private constant WAD = 1e18;
    /// Bounds on the per-round odds from fight history, so no match opens as a near-certainty.
    uint256 public constant MIN_ROUND_ODDS = 0.2e18;
    uint256 public constant MAX_ROUND_ODDS = 0.8e18;
    /// Prices beyond this many log-odds (about 1e-30 from 0 or 1) are treated as final; trades are refused.
    int256 private constant MAX_LOGIT = 70e18;

    // ---------------------------------------------------------------- state

    address public owner;
    address public operator;
    address public treasury;
    bool public paused;
    uint256 public houseBalance; // free house MON: funds new match bankrolls, receives match surpluses
    uint32 public nextFighterId = 1;
    uint256 public nextMatchId = 1;
    uint256 private _locked = 1;

    mapping(uint8 => WeightClass) public classes;
    mapping(uint32 => Fighter) public fighters;
    mapping(uint256 => Match) private _matches;
    mapping(uint256 => mapping(address => Position)) public positions;
    /// votes[matchId][round 1..3][label 0/1]
    mapping(uint256 => mapping(uint8 => uint32[2])) private _votes;
    mapping(uint256 => mapping(uint8 => mapping(address => bool))) public hasVoted;

    // --------------------------------------------------------------- events

    event WeightClassSet(uint8 indexed classId, WeightClass c);
    event FighterRegistered(uint32 indexed fighterId, address indexed owner, uint8 classId, bytes32 profileHash);
    event HouseFunded(address indexed from, uint256 amount, uint256 houseBalance);
    event HouseWithdrawn(address indexed to, uint256 amount, uint256 houseBalance);
    event MatchCreated(
        uint256 indexed matchId,
        uint8 indexed classId,
        uint32 fighterA,
        uint32 fighterB,
        uint256 roundOdds,
        uint256 priceA,
        bytes32 taskHash,
        uint40 tradeEnd,
        uint40 time
    );
    /// side 0 = A, 1 = B. priceA is fighter A's price after the trade (wad).
    event Traded(
        uint256 indexed matchId,
        address indexed user,
        uint8 side,
        bool isBuy,
        uint256 mon,
        uint256 shares,
        uint256 fee,
        uint256 priceA,
        uint40 time
    );
    event VotingOpened(
        uint256 indexed matchId, uint8 round, bytes32 revealCommit, bytes32 pitchesHash, uint40 voteEnd, uint40 time
    );
    event Voted(uint256 indexed matchId, uint8 round, address indexed user, uint8 label);
    event RoundResolved(
        uint256 indexed matchId,
        uint8 round,
        uint8 winner,
        uint32 votesA,
        uint32 votesB,
        bool swapped,
        uint8 winsA,
        uint8 winsB,
        uint256 priceA,
        uint40 tradeEnd,
        uint40 time
    );
    event MatchResolved(
        uint256 indexed matchId, uint8 winner, uint32 winnerFighterId, uint256 payout, uint256 houseReturn
    );
    event MatchCancelled(uint256 indexed matchId, address by);
    event Claimed(uint256 indexed matchId, address indexed user, uint256 payout);
    event Refunded(uint256 indexed matchId, address indexed user, uint256 amount);

    // --------------------------------------------------------------- errors

    error NotOwner();
    error NotOperator();
    error NotTreasury();
    error ZeroAddress();
    error Paused();
    error Reentrancy();
    error InvalidClass();
    error ClassInactive();
    error UnknownFighter();
    error FighterClassMismatch();
    error SameFighter();
    error BadTradeEnd();
    error HouseTooSmall();
    error WrongPhase();
    error TradingClosed();
    error TradeOutOfRange();
    error BadSide();
    error Slippage();
    error NotEnoughShares();
    error MarketFull();
    error PriceFinal();
    error TooEarly();
    error Expired();
    error NotExpired();
    error ZeroCommit();
    error VotingClosed();
    error NoPosition();
    error AlreadyVoted();
    error BadLabel();
    error BadReveal();
    error NothingToClaim();
    error AlreadySettled();
    error InsufficientHouse();
    error TransferFailed();

    // ------------------------------------------------------------ modifiers

    constructor() {
        owner = msg.sender;
        treasury = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyOperator() {
        if (msg.sender != operator) revert NotOperator();
        _;
    }

    modifier nonReentrant() {
        if (_locked != 1) revert Reentrancy();
        _locked = 2;
        _;
        _locked = 1;
    }

    // ---------------------------------------------------------------- admin

    function setWeightClass(uint8 classId, WeightClass calldata c) external onlyOwner {
        if (
            c.minTrade == 0 || c.minTrade > c.maxTrade || c.bankroll == 0 || c.liquidity == 0 || c.feeBps > MAX_FEE_BPS
                || c.tradeWindow == 0 || c.voteDuration == 0
        ) revert InvalidClass();
        classes[classId] = c;
        emit WeightClassSet(classId, c);
    }

    function setOperator(address op) external onlyOwner {
        if (op == address(0)) revert ZeroAddress();
        operator = op;
    }

    function setTreasury(address t) external onlyOwner {
        if (t == address(0)) revert ZeroAddress();
        treasury = t;
    }

    function setPaused(bool p) external onlyOwner {
        paused = p;
    }

    /// Adds MON to the house bankroll that backs matches.
    function fundHouse() external payable {
        houseBalance += msg.value;
        emit HouseFunded(msg.sender, msg.value, houseBalance);
    }

    /// Treasury takes free house MON out (never MON backing a live match).
    function withdrawHouse(uint256 amount) external nonReentrant {
        if (msg.sender != treasury) revert NotTreasury();
        if (amount > houseBalance) revert InsufficientHouse();
        houseBalance -= amount;
        emit HouseWithdrawn(msg.sender, amount, houseBalance);
        _send(msg.sender, amount);
    }

    function registerFighter(address fighterOwner, uint8 classId, bytes32 profileHash)
        external
        onlyOperator
        returns (uint32 fighterId)
    {
        if (fighterOwner == address(0)) revert ZeroAddress();
        if (!classes[classId].active) revert ClassInactive();
        fighterId = nextFighterId++;
        fighters[fighterId] =
            Fighter({owner: fighterOwner, classId: classId, wins: 0, losses: 0, profileHash: profileHash});
        emit FighterRegistered(fighterId, fighterOwner, classId, profileHash);
    }

    // ------------------------------------------------------------ lifecycle

    /// Stage 1: opens a 50/50 market. Locks the class bankroll from the house.
    function createMatch(uint8 classId, uint32 fighterA, uint32 fighterB, bytes32 taskHash, uint40 tradeEnd)
        external
        onlyOperator
        returns (uint256 matchId)
    {
        if (paused) revert Paused();
        WeightClass memory c = classes[classId];
        if (!c.active) revert ClassInactive();
        if (fighterA == fighterB) revert SameFighter();
        _requireFighter(fighterA, classId);
        _requireFighter(fighterB, classId);
        if (tradeEnd <= block.timestamp) revert BadTradeEnd();
        if (houseBalance < c.bankroll) revert HouseTooSmall();

        houseBalance -= c.bankroll;
        matchId = nextMatchId++;
        Match storage m = _matches[matchId];
        m.classId = classId;
        m.phase = Phase.Open;
        m.fighterA = fighterA;
        m.fighterB = fighterB;
        m.tradeEnd = tradeEnd;
        m.deadline = _stageDeadline(tradeEnd, c.voteDuration, c.settleGrace);
        m.pool = c.bankroll;
        m.roundOdds = uint64(roundOddsFor(fighterA, fighterB));
        m.anchor = int128(_logit(_matchOdds(m.roundOdds, 0, 0)));
        m.taskHash = taskHash;
        m.minTrade = c.minTrade;
        m.maxTrade = c.maxTrade;
        m.liquidity = c.liquidity;
        m.feeBps = c.feeBps;
        m.tradeWindow = c.tradeWindow;
        m.voteDuration = c.voteDuration;
        m.settleGrace = c.settleGrace;

        emit MatchCreated(
            matchId, classId, fighterA, fighterB, m.roundOdds, _priceA(m), taskHash, tradeEnd, uint40(block.timestamp)
        );
    }

    /// Ends the fighters' work for the next round and opens voting on blind pitches.
    /// revealCommit = keccak256(abi.encode(matchId, round, swapped, tieWinner, salt)), where swapped means
    /// label 0 is fighter B's pitch, and tieWinner (0/1) takes the round on a tied or empty vote.
    function openVoting(uint256 matchId, bytes32 revealCommit, bytes32 pitchesHash) external onlyOperator {
        Match storage m = _matches[matchId];
        if (m.phase != Phase.Open) revert WrongPhase();
        if (block.timestamp < m.tradeEnd) revert TooEarly();
        if (block.timestamp > m.deadline) revert Expired();
        if (revealCommit == bytes32(0)) revert ZeroCommit();

        uint40 voteEnd = uint40(block.timestamp) + m.voteDuration;
        m.phase = Phase.Voting;
        m.voteEnd = voteEnd;
        m.deadline = voteEnd + m.settleGrace;
        m.revealCommit = revealCommit;
        m.pitchesHash = pitchesHash;

        emit VotingOpened(matchId, m.round + 1, revealCommit, pitchesHash, voteEnd, uint40(block.timestamp));
    }

    /// Counts the round's votes, then either ends the match (2 round wins) or re-prices it and reopens trading.
    function resolveRound(uint256 matchId, bool swapped, uint8 tieWinner, bytes32 salt) external onlyOperator {
        Match storage m = _matches[matchId];
        if (m.phase != Phase.Voting) revert WrongPhase();
        if (block.timestamp < m.voteEnd) revert TooEarly();
        if (block.timestamp > m.deadline) revert Expired();
        uint8 round = m.round + 1;
        if (tieWinner > 1 || keccak256(abi.encode(matchId, round, swapped, tieWinner, salt)) != m.revealCommit) {
            revert BadReveal();
        }

        uint32[2] storage byLabel = _votes[matchId][round];
        (uint32 votesA, uint32 votesB) = swapped ? (byLabel[1], byLabel[0]) : (byLabel[0], byLabel[1]);
        uint8 winner = votesA > votesB ? 0 : votesB > votesA ? 1 : tieWinner;

        m.round = round;
        if (winner == 0) m.winsA++;
        else m.winsB++;

        if (m.winsA == ROUNDS_TO_WIN || m.winsB == ROUNDS_TO_WIN) {
            emit RoundResolved(
                matchId,
                round,
                winner,
                votesA,
                votesB,
                swapped,
                m.winsA,
                m.winsB,
                winner == 0 ? 1e18 : 0,
                0,
                uint40(block.timestamp)
            );
            _resolveMatch(matchId, m, winner);
            return;
        }

        // Re-anchor: the price becomes fighter A's chance of taking the best of 3 from here, given its
        // per-round odds from fight history (even fighters: 1-0 up = 75%, level = 50%).
        m.anchor = int128(_logit(_matchOdds(m.roundOdds, m.winsA, m.winsB)) - _imbalance(m));
        m.phase = Phase.Open;
        m.tradeEnd = uint40(block.timestamp) + m.tradeWindow;
        m.deadline = _stageDeadline(m.tradeEnd, m.voteDuration, m.settleGrace);

        emit RoundResolved(
            matchId,
            round,
            winner,
            votesA,
            votesB,
            swapped,
            m.winsA,
            m.winsB,
            _priceA(m),
            m.tradeEnd,
            uint40(block.timestamp)
        );
    }

    function cancel(uint256 matchId) external onlyOperator {
        _cancel(matchId);
    }

    /// Anyone can cancel a match the operator abandoned, which turns on refunds.
    function cancelExpired(uint256 matchId) external {
        if (block.timestamp <= _matches[matchId].deadline) revert NotExpired();
        _cancel(matchId);
    }

    // -------------------------------------------------------------- trading

    /// Buys shares of `side` (0 = A, 1 = B) with msg.value. Reverts if fewer than minShares would be bought.
    function buy(uint256 matchId, uint8 side, uint256 minShares) external payable returns (uint256 shares) {
        if (paused) revert Paused();
        Match storage m = _openForTrading(matchId);
        if (side > 1) revert BadSide();
        if (msg.value < m.minTrade || msg.value > m.maxTrade) revert TradeOutOfRange();

        uint256 fee;
        (shares, fee) = _quoteBuy(m, side, msg.value);
        if (shares == 0 || shares < minShares) revert Slippage();

        Position storage p = positions[matchId][msg.sender];
        uint256 owedBefore = _owed(p);
        if (side == 0) {
            m.sharesA += uint128(shares);
            p.sharesA += uint128(shares);
        } else {
            m.sharesB += uint128(shares);
            p.sharesB += uint128(shares);
        }
        p.paid += uint128(msg.value);
        m.pool += uint128(msg.value - fee);
        m.fees += uint128(fee);
        _trackOwed(m, owedBefore, _owed(p));
        _requireSolvent(m);

        emit Traded(matchId, msg.sender, side, true, msg.value, shares, fee, _priceA(m), uint40(block.timestamp));
    }

    /// Sells (cashes out) `shares` of `side` at the current price. Reverts if the payout is below minProceeds.
    function sell(uint256 matchId, uint8 side, uint256 shares, uint256 minProceeds)
        external
        nonReentrant
        returns (uint256 proceeds)
    {
        Match storage m = _openForTrading(matchId);
        if (side > 1) revert BadSide();
        Position storage p = positions[matchId][msg.sender];
        if (shares == 0 || shares > (side == 0 ? p.sharesA : p.sharesB)) revert NotEnoughShares();

        (uint256 gross, uint256 fee) = _quoteSell(m, side, shares);
        proceeds = gross - fee;
        if (proceeds == 0 || proceeds < minProceeds) revert Slippage();

        uint256 owedBefore = _owed(p);
        if (side == 0) {
            m.sharesA -= uint128(shares);
            p.sharesA -= uint128(shares);
        } else {
            m.sharesB -= uint128(shares);
            p.sharesB -= uint128(shares);
        }
        p.received += uint128(proceeds);
        m.pool -= uint128(gross);
        m.fees += uint128(fee);
        _trackOwed(m, owedBefore, _owed(p));
        _requireSolvent(m);

        emit Traded(matchId, msg.sender, side, false, proceeds, shares, fee, _priceA(m), uint40(block.timestamp));
        _send(msg.sender, proceeds);
    }

    // --------------------------------------------------------------- voting

    /// One vote per position holder per round, for blind label 0 or 1.
    function vote(uint256 matchId, uint8 label) external {
        Match storage m = _matches[matchId];
        if (m.phase != Phase.Voting) revert WrongPhase();
        if (block.timestamp >= m.voteEnd) revert VotingClosed();
        if (label > 1) revert BadLabel();
        Position storage p = positions[matchId][msg.sender];
        if (p.sharesA == 0 && p.sharesB == 0) revert NoPosition();
        uint8 round = m.round + 1;
        if (hasVoted[matchId][round][msg.sender]) revert AlreadyVoted();

        hasVoted[matchId][round][msg.sender] = true;
        _votes[matchId][round][label]++;
        emit Voted(matchId, round, msg.sender, label);
    }

    // ------------------------------------------------------------- payouts

    /// Stage 5: each winning share pays 1 MON.
    function claim(uint256 matchId) external nonReentrant returns (uint256 payout) {
        Match storage m = _matches[matchId];
        if (m.phase != Phase.Resolved) revert WrongPhase();
        Position storage p = positions[matchId][msg.sender];
        if (p.settled) revert AlreadySettled();
        payout = m.winner == 0 ? p.sharesA : p.sharesB;
        if (payout == 0) revert NothingToClaim();

        p.settled = true;
        emit Claimed(matchId, msg.sender, payout);
        _send(msg.sender, payout);
    }

    /// Cancelled matches refund what each trader put in minus what they already took out, pro rata if short.
    function refund(uint256 matchId) external nonReentrant returns (uint256 amount) {
        Match storage m = _matches[matchId];
        if (m.phase != Phase.Cancelled) revert WrongPhase();
        Position storage p = positions[matchId][msg.sender];
        if (p.settled) revert AlreadySettled();
        uint256 owed = _owed(p);
        if (owed == 0) revert NothingToClaim();

        amount = m.refundFunds >= m.refundOwed ? owed : owed * m.refundFunds / m.refundOwed;
        p.settled = true;
        emit Refunded(matchId, msg.sender, amount);
        _send(msg.sender, amount);
    }

    // ---------------------------------------------------------------- views

    function matches(uint256 matchId) external view returns (Match memory) {
        return _matches[matchId];
    }

    /// Fighter A's price in wad (1e18 = 1 MON). Fighter B's is 1e18 - priceA.
    function priceA(uint256 matchId) external view returns (uint256) {
        return _priceA(_matches[matchId]);
    }

    /// Shares bought for `value` wei (fee included in value), and the fee.
    function quoteBuy(uint256 matchId, uint8 side, uint256 value) external view returns (uint256 shares, uint256 fee) {
        if (side > 1) revert BadSide();
        return _quoteBuy(_matches[matchId], side, value);
    }

    /// MON received for selling `shares` (after fee), and the fee.
    function quoteSell(uint256 matchId, uint8 side, uint256 shares)
        external
        view
        returns (uint256 proceeds, uint256 fee)
    {
        if (side > 1) revert BadSide();
        (uint256 gross, uint256 f) = _quoteSell(_matches[matchId], side, shares);
        return (gross - f, f);
    }

    function votes(uint256 matchId, uint8 round) external view returns (uint32 label0, uint32 label1) {
        uint32[2] storage v = _votes[matchId][round];
        return (v[0], v[1]);
    }

    /// 1 start/trading, 2-4 rounds (pitch, aspects, MVP), 5 result. 0 for unknown or cancelled matches.
    function stageOf(uint256 matchId) external view returns (uint8) {
        Match storage m = _matches[matchId];
        if (m.phase == Phase.Resolved) return 5;
        if (m.phase == Phase.None || m.phase == Phase.Cancelled) return 0;
        if (m.phase == Phase.Open && m.round == 0 && block.timestamp < m.tradeEnd) return 1;
        return m.round + 2;
    }

    function isTradingOpen(uint256 matchId) external view returns (bool) {
        Match storage m = _matches[matchId];
        return m.phase == Phase.Open && block.timestamp < m.tradeEnd && !paused;
    }

    /// Fighter A's chance of winning one round against B, from both fighters' on-chain records.
    /// Each record becomes a smoothed win rate (wins + 1) / (fights + 2), so new fighters count as 50%,
    /// then the two rates are combined head to head with the log5 formula and clamped to 20-80%.
    function roundOddsFor(uint32 fighterA, uint32 fighterB) public view returns (uint256) {
        uint256 a = _winRate(fighters[fighterA]);
        uint256 b = _winRate(fighters[fighterB]);
        uint256 num = a * (1e18 - b);
        uint256 q = num * 1e18 / (num + b * (1e18 - a));
        return q < MIN_ROUND_ODDS ? MIN_ROUND_ODDS : q > MAX_ROUND_ODDS ? MAX_ROUND_ODDS : q;
    }

    /// The price fighter A would open at against B, before any trading.
    function openingPriceA(uint32 fighterA, uint32 fighterB) external view returns (uint256) {
        return _matchOdds(roundOddsFor(fighterA, fighterB), 0, 0);
    }

    // ------------------------------------------------------------- internal

    function _openForTrading(uint256 matchId) private view returns (Match storage m) {
        m = _matches[matchId];
        if (m.phase != Phase.Open) revert WrongPhase();
        if (block.timestamp >= m.tradeEnd) revert TradingClosed();
    }

    function _requireFighter(uint32 id, uint8 classId) private view {
        Fighter storage f = fighters[id];
        if (f.owner == address(0)) revert UnknownFighter();
        if (f.classId != classId) revert FighterClassMismatch();
    }

    function _stageDeadline(uint40 tradeEnd, uint32 voteDuration, uint32 settleGrace) private pure returns (uint40) {
        return tradeEnd + MAX_FIGHT_SECONDS + voteDuration + settleGrace;
    }

    /// (sharesA - sharesB) / b in wad: how far trading has pushed the price from the anchor.
    function _imbalance(Match storage m) private view returns (int256) {
        return (int256(uint256(m.sharesA)) - int256(uint256(m.sharesB))) * WAD / int256(uint256(m.liquidity));
    }

    /// Log-odds of fighter A winning.
    function _logitA(Match storage m) private view returns (int256) {
        return int256(m.anchor) + _imbalance(m);
    }

    function _priceA(Match storage m) private view returns (uint256) {
        if (m.phase == Phase.None) return 0;
        return uint256(_sigmoid(_logitA(m)));
    }

    /// Log-odds from the traded side's point of view.
    function _sideLogit(Match storage m, uint8 side) private view returns (int256 s) {
        s = _logitA(m);
        if (side == 1) s = -s;
    }

    /// Polymarket-style fee: feeBps at a 50/50 price, shrinking toward 0 as the price nears 0 or 1.
    function _fee(uint256 amount, uint16 feeBps, int256 s) private pure returns (uint256) {
        uint256 p = uint256(_sigmoid(s));
        return amount * feeBps * 4 * p / 1e18 * (1e18 - p) / 1e18 / 10_000;
    }

    /// LMSR buy, solved for shares: spending m (after fee) moves the side's log-odds from s to s + shares/b
    /// where softplus(s + shares/b) = softplus(s) + m/b.
    function _quoteBuy(Match storage m, uint8 side, uint256 value) private view returns (uint256 shares, uint256 fee) {
        int256 s = _sideLogit(m, side);
        if (s >= MAX_LOGIT || s <= -MAX_LOGIT) revert PriceFinal();
        fee = _fee(value, m.feeBps, s);
        int256 b = int256(uint256(m.liquidity));
        int256 y = _softplus(s) + int256(value - fee) * WAD / b;
        if (y >= MAX_LOGIT) revert PriceFinal();
        int256 newS = FPM.lnWad(FPM.expWad(y) - WAD);
        if (newS <= s) return (0, fee);
        shares = uint256((newS - s) * b / WAD);
    }

    /// LMSR sell: proceeds = b * (softplus(s) - softplus(s - shares/b)), before fee.
    function _quoteSell(Match storage m, uint8 side, uint256 shares) private view returns (uint256 gross, uint256 fee) {
        int256 s = _sideLogit(m, side);
        if (s >= MAX_LOGIT || s <= -MAX_LOGIT) revert PriceFinal();
        int256 b = int256(uint256(m.liquidity));
        int256 newS = s - int256(shares) * WAD / b;
        int256 diff = _softplus(s) - _softplus(newS);
        if (diff <= 0) return (0, 0);
        gross = uint256(diff * b / WAD);
        if (gross > shares) gross = shares; // a share is never worth more than 1 MON
        fee = _fee(gross, m.feeBps, s);
    }

    /// ln(1 + e^x) in wad, computed without overflow for large |x|.
    function _softplus(int256 x) private pure returns (int256) {
        if (x > 0) return x + FPM.lnWad(WAD + FPM.expWad(-x));
        return FPM.lnWad(WAD + FPM.expWad(x));
    }

    /// 1 / (1 + e^-x) in wad.
    function _sigmoid(int256 x) private pure returns (int256) {
        if (x >= MAX_LOGIT) return WAD;
        if (x <= -MAX_LOGIT) return 0;
        return WAD * WAD / (WAD + FPM.expWad(-x));
    }

    function _winRate(Fighter storage f) private view returns (uint256) {
        return (uint256(f.wins) + 1) * 1e18 / (uint256(f.wins) + f.losses + 2);
    }

    /// Chance fighter A takes the best of 3 when each round is won with probability q, given rounds won so far.
    function _matchOdds(uint256 q, uint8 winsA, uint8 winsB) private pure returns (uint256) {
        uint256 r = 1e18 - q;
        if (winsA == winsB) {
            return winsA == 0 ? q * q / 1e18 * (3e18 - 2 * q) / 1e18 : q; // 0-0: q^2(3-2q); 1-1: q
        }
        return winsA > winsB ? 1e18 - r * r / 1e18 : q * q / 1e18; // 1-0: 1-(1-q)^2; 0-1: q^2
    }

    /// ln(p / (1 - p)) in wad.
    function _logit(uint256 p) private pure returns (int256) {
        return FPM.lnWad(int256(p * 1e18 / (1e18 - p)));
    }

    /// Every winning share must be payable from the match pool, whichever fighter wins.
    function _requireSolvent(Match storage m) private view {
        uint256 maxShares = m.sharesA > m.sharesB ? m.sharesA : m.sharesB;
        if (m.pool < maxShares) revert MarketFull();
    }

    function _owed(Position storage p) private view returns (uint256) {
        return p.paid > p.received ? p.paid - p.received : 0;
    }

    function _trackOwed(Match storage m, uint256 before, uint256 afterOwed) private {
        m.refundOwed = uint128(uint256(m.refundOwed) + afterOwed - before);
    }

    function _resolveMatch(uint256 matchId, Match storage m, uint8 winner) private {
        m.phase = Phase.Resolved;
        m.winner = winner;
        (uint32 winId, uint32 loseId) = winner == 0 ? (m.fighterA, m.fighterB) : (m.fighterB, m.fighterA);
        fighters[winId].wins++;
        fighters[loseId].losses++;

        uint256 payout = winner == 0 ? m.sharesA : m.sharesB;
        uint256 houseReturn = uint256(m.pool) + m.fees - payout;
        houseBalance += houseReturn;
        emit MatchResolved(matchId, winner, winId, payout, houseReturn);
    }

    function _cancel(uint256 matchId) private {
        Match storage m = _matches[matchId];
        if (m.phase != Phase.Open && m.phase != Phase.Voting) revert WrongPhase();
        m.phase = Phase.Cancelled;
        uint256 funds = uint256(m.pool) + m.fees;
        uint256 toRefund = funds < m.refundOwed ? funds : m.refundOwed;
        m.refundFunds = uint128(toRefund);
        houseBalance += funds - toRefund;
        emit MatchCancelled(matchId, msg.sender);
    }

    function _send(address to, uint256 amount) private {
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
