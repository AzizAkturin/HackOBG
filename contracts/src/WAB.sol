// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

contract WAB {
    enum Phase {
        None,
        Open,
        Fighting,
        Voting,
        Settled,
        Cancelled
    }

    struct WeightClass {
        uint96 minBet;
        uint96 maxBet;
        uint16 rakeBps;
        uint32 voteDuration;
        uint32 settleGrace;
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

    struct Round {
        uint8 classId;
        Phase phase;
        uint8 fighterCount;
        uint8 winnerIndex;
        uint40 lockTime;
        uint40 voteEnd;
        uint40 settleDeadline;
        bytes32 taskHash;
        bytes32 revealCommit;
        bytes32 pitchesHash;
        uint128 totalPool;
        uint128 rake;
        uint96 minBet;
        uint96 maxBet;
        uint16 rakeBps;
        uint32 voteDuration;
        uint32 settleGrace;
    }

    struct Entry {
        uint128 amount;
        uint8 fighterIndex;
        bool voted;
        bool claimed;
    }

    uint8 public constant MAX_FIGHTERS = 8;
    uint40 public constant MAX_FIGHT_SECONDS = 600;
    uint16 public constant MAX_RAKE_BPS = 1000;

    address public owner;
    address public operator;
    address public treasury;
    bool public paused;
    uint256 public accruedRake;
    uint32 public nextFighterId = 1;
    uint256 public nextRoundId = 1;
    uint256 private _locked = 1;

    mapping(uint8 => WeightClass) public classes;
    mapping(uint32 => Fighter) public fighters;
    mapping(uint256 => Round) private _rounds;
    mapping(uint256 => uint32[8]) public roundFighters;
    mapping(uint256 => uint128[8]) public poolByIndex;
    mapping(uint256 => uint32[8]) public votesByLabel;
    mapping(uint256 => mapping(address => Entry)) public entries;

    event WeightClassSet(uint8 indexed classId, WeightClass c);
    event FighterRegistered(uint32 indexed fighterId, address indexed owner, uint8 classId, bytes32 profileHash);
    event RoundCreated(uint256 indexed roundId, uint8 indexed classId, uint32[] fighterIds, bytes32 taskHash, uint40 lockTime);
    event Entered(uint256 indexed roundId, address indexed user, uint8 fighterIndex, uint128 amount, uint128 fighterPool, uint128 totalPool);
    event VotingOpened(uint256 indexed roundId, bytes32 revealCommit, bytes32 pitchesHash, uint40 voteEnd);
    event Voted(uint256 indexed roundId, address indexed user, uint8 label);
    event Settled(uint256 indexed roundId, uint8 winnerIndex, uint32 winnerFighterId, uint8[] labelToIndex, uint128 totalPool, uint128 rake, bool refundMode);
    event RoundCancelled(uint256 indexed roundId, address by);
    event Claimed(uint256 indexed roundId, address indexed user, uint128 payout);
    event Refunded(uint256 indexed roundId, address indexed user, uint128 amount);

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
    error DuplicateFighter();
    error BadFighterCount();
    error BadLockTime();
    error WrongPhase();
    error BettingClosed();
    error BadFighterIndex();
    error DifferentFighter();
    error ZeroValue();
    error BetOutOfRange();
    error TooEarly();
    error Expired();
    error NotExpired();
    error ZeroCommit();
    error VotingClosed();
    error NoEntry();
    error AlreadyVoted();
    error BadLabel();
    error BadReveal();
    error NotPermutation();
    error NotWinner();
    error RefundMode();
    error NotRefundable();
    error AlreadyClaimed();
    error InsufficientRake();
    error TransferFailed();

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

    function setWeightClass(uint8 classId, WeightClass calldata c) external onlyOwner {
        if (c.minBet == 0 || c.minBet > c.maxBet || c.rakeBps > MAX_RAKE_BPS || c.voteDuration == 0) {
            revert InvalidClass();
        }
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

    function registerFighter(address fighterOwner, uint8 classId, bytes32 profileHash)
        external
        onlyOperator
        returns (uint32 fighterId)
    {
        if (fighterOwner == address(0)) revert ZeroAddress();
        if (!classes[classId].active) revert ClassInactive();
        fighterId = nextFighterId++;
        fighters[fighterId] = Fighter({owner: fighterOwner, classId: classId, wins: 0, losses: 0, profileHash: profileHash});
        emit FighterRegistered(fighterId, fighterOwner, classId, profileHash);
    }

    function createRound(uint8 classId, uint32[] calldata fighterIds, bytes32 taskHash, uint40 lockTime)
        external
        onlyOperator
        returns (uint256 roundId)
    {
        if (paused) revert Paused();
        WeightClass memory c = classes[classId];
        if (!c.active) revert ClassInactive();
        uint256 n = fighterIds.length;
        if (n < 2 || n > MAX_FIGHTERS) revert BadFighterCount();
        if (lockTime <= block.timestamp) revert BadLockTime();

        roundId = nextRoundId++;
        for (uint256 i; i < n; ++i) {
            uint32 id = fighterIds[i];
            Fighter storage f = fighters[id];
            if (f.owner == address(0)) revert UnknownFighter();
            if (f.classId != classId) revert FighterClassMismatch();
            for (uint256 j; j < i; ++j) {
                if (fighterIds[j] == id) revert DuplicateFighter();
            }
            roundFighters[roundId][i] = id;
        }

        Round storage r = _rounds[roundId];
        r.classId = classId;
        r.phase = Phase.Open;
        r.fighterCount = uint8(n);
        r.lockTime = lockTime;
        r.settleDeadline = lockTime + MAX_FIGHT_SECONDS + c.voteDuration + c.settleGrace;
        r.taskHash = taskHash;
        r.minBet = c.minBet;
        r.maxBet = c.maxBet;
        r.rakeBps = c.rakeBps;
        r.voteDuration = c.voteDuration;
        r.settleGrace = c.settleGrace;

        emit RoundCreated(roundId, classId, fighterIds, taskHash, lockTime);
    }

    function openVoting(uint256 roundId, bytes32 revealCommit, bytes32 pitchesHash) external onlyOperator {
        Round storage r = _rounds[roundId];
        if (r.phase != Phase.Open) revert WrongPhase();
        if (block.timestamp < r.lockTime) revert TooEarly();
        if (block.timestamp > r.settleDeadline) revert Expired();
        if (revealCommit == bytes32(0)) revert ZeroCommit();

        uint40 voteEnd = uint40(block.timestamp) + r.voteDuration;
        r.phase = Phase.Voting;
        r.voteEnd = voteEnd;
        r.settleDeadline = voteEnd + r.settleGrace;
        r.revealCommit = revealCommit;
        r.pitchesHash = pitchesHash;

        emit VotingOpened(roundId, revealCommit, pitchesHash, voteEnd);
    }

    function settle(uint256 roundId, uint8[] calldata labelToIndex, uint8[] calldata judgeRank, bytes32 salt)
        external
        onlyOperator
    {
        Round storage r = _rounds[roundId];
        if (r.phase != Phase.Voting) revert WrongPhase();
        if (block.timestamp < r.voteEnd) revert TooEarly();
        if (block.timestamp > r.settleDeadline) revert Expired();
        if (keccak256(abi.encode(roundId, labelToIndex, judgeRank, salt)) != r.revealCommit) revert BadReveal();

        uint256 n = r.fighterCount;
        _requirePermutation(labelToIndex, n);
        _requirePermutation(judgeRank, n);
        uint8 winner = _tally(roundId, labelToIndex, judgeRank, n);
        uint32 winnerId = _recordResult(roundId, winner, n);

        bool refundMode = poolByIndex[roundId][winner] == 0;
        uint128 rake;
        if (!refundMode) {
            rake = uint128(uint256(r.totalPool) * r.rakeBps / 10_000);
            accruedRake += rake;
        }
        r.rake = rake;
        r.winnerIndex = winner;
        r.phase = Phase.Settled;

        emit Settled(roundId, winner, winnerId, labelToIndex, r.totalPool, rake, refundMode);
    }

    function cancel(uint256 roundId) external onlyOperator {
        _cancel(roundId);
    }

    function cancelExpired(uint256 roundId) external {
        if (block.timestamp <= _rounds[roundId].settleDeadline) revert NotExpired();
        _cancel(roundId);
    }

    function enter(uint256 roundId, uint8 fighterIndex) external payable {
        if (paused) revert Paused();
        Round storage r = _rounds[roundId];
        if (r.phase != Phase.Open) revert WrongPhase();
        if (block.timestamp >= r.lockTime) revert BettingClosed();
        if (fighterIndex >= r.fighterCount) revert BadFighterIndex();
        if (msg.value == 0) revert ZeroValue();

        Entry storage e = entries[roundId][msg.sender];
        if (e.amount != 0 && e.fighterIndex != fighterIndex) revert DifferentFighter();
        uint256 newAmount = uint256(e.amount) + msg.value;
        if (newAmount < r.minBet || newAmount > r.maxBet) revert BetOutOfRange();

        e.amount = uint128(newAmount);
        e.fighterIndex = fighterIndex;
        uint128 fighterPool = poolByIndex[roundId][fighterIndex] += uint128(msg.value);
        uint128 totalPool = r.totalPool += uint128(msg.value);

        emit Entered(roundId, msg.sender, fighterIndex, uint128(msg.value), fighterPool, totalPool);
    }

    function vote(uint256 roundId, uint8 label) external {
        Round storage r = _rounds[roundId];
        if (r.phase != Phase.Voting) revert WrongPhase();
        if (block.timestamp >= r.voteEnd) revert VotingClosed();
        Entry storage e = entries[roundId][msg.sender];
        if (e.amount == 0) revert NoEntry();
        if (e.voted) revert AlreadyVoted();
        if (label >= r.fighterCount) revert BadLabel();

        e.voted = true;
        votesByLabel[roundId][label]++;
        emit Voted(roundId, msg.sender, label);
    }

    function claim(uint256 roundId) external nonReentrant {
        Round storage r = _rounds[roundId];
        if (r.phase != Phase.Settled) revert WrongPhase();
        uint128 winnerPool = poolByIndex[roundId][r.winnerIndex];
        if (winnerPool == 0) revert RefundMode();
        Entry storage e = entries[roundId][msg.sender];
        if (e.amount == 0 || e.fighterIndex != r.winnerIndex) revert NotWinner();
        if (e.claimed) revert AlreadyClaimed();

        e.claimed = true;
        uint128 payout = uint128(uint256(e.amount) * (r.totalPool - r.rake) / winnerPool);
        emit Claimed(roundId, msg.sender, payout);
        _send(msg.sender, payout);
    }

    function refund(uint256 roundId) external nonReentrant {
        Round storage r = _rounds[roundId];
        bool refundable =
            r.phase == Phase.Cancelled || (r.phase == Phase.Settled && poolByIndex[roundId][r.winnerIndex] == 0);
        if (!refundable) revert NotRefundable();
        Entry storage e = entries[roundId][msg.sender];
        if (e.amount == 0) revert NoEntry();
        if (e.claimed) revert AlreadyClaimed();

        e.claimed = true;
        emit Refunded(roundId, msg.sender, e.amount);
        _send(msg.sender, e.amount);
    }

    function withdrawRake(uint256 amount) external nonReentrant {
        if (msg.sender != treasury) revert NotTreasury();
        if (amount > accruedRake) revert InsufficientRake();
        accruedRake -= amount;
        _send(msg.sender, amount);
    }

    function rounds(uint256 roundId) external view returns (Round memory) {
        return _rounds[roundId];
    }

    function phaseOf(uint256 roundId) external view returns (Phase) {
        Round storage r = _rounds[roundId];
        if (r.phase == Phase.Open && block.timestamp >= r.lockTime) return Phase.Fighting;
        return r.phase;
    }

    function _tally(uint256 roundId, uint8[] calldata labelToIndex, uint8[] calldata judgeRank, uint256 n)
        private
        view
        returns (uint8 winner)
    {
        uint32[8] memory votesByIndex;
        uint32[8] storage labelVotes = votesByLabel[roundId];
        for (uint256 label; label < n; ++label) {
            votesByIndex[labelToIndex[label]] = labelVotes[label];
        }
        // walking judgeRank best-first with a strict > sends ties and the zero-vote case to the judge's pick
        winner = judgeRank[0];
        for (uint256 i = 1; i < n; ++i) {
            uint8 idx = judgeRank[i];
            if (votesByIndex[idx] > votesByIndex[winner]) winner = idx;
        }
    }

    function _recordResult(uint256 roundId, uint8 winner, uint256 n) private returns (uint32 winnerId) {
        uint32[8] storage ids = roundFighters[roundId];
        for (uint256 i; i < n; ++i) {
            if (i == winner) fighters[ids[i]].wins++;
            else fighters[ids[i]].losses++;
        }
        winnerId = ids[winner];
    }

    function _cancel(uint256 roundId) private {
        Round storage r = _rounds[roundId];
        if (r.phase != Phase.Open && r.phase != Phase.Voting) revert WrongPhase();
        r.phase = Phase.Cancelled;
        emit RoundCancelled(roundId, msg.sender);
    }

    function _requirePermutation(uint8[] calldata xs, uint256 n) private pure {
        if (xs.length != n) revert NotPermutation();
        uint256 seen;
        for (uint256 i; i < n; ++i) {
            uint256 x = xs[i];
            if (x >= n || seen & (1 << x) != 0) revert NotPermutation();
            seen |= 1 << x;
        }
    }

    function _send(address to, uint256 amount) private {
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
