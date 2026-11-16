// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {WAB} from "../src/WAB.sol";

contract WABTest is Test {
    WAB wab;
    address owner = address(this);
    address operator = makeAddr("operator");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address carol = makeAddr("carol");
    address outsider = makeAddr("outsider");
    uint32 fA;
    uint32 fB;
    bytes32 constant SALT = keccak256("salt");

    uint8 constant A = 0;
    uint8 constant B = 1;

    function setUp() public {
        vm.warp(1_800_000_000);
        wab = new WAB();
        wab.setWeightClass(0, _class(0.01 ether, 0.1 ether, 1 ether, 0.5 ether));
        // a loose class for edge cases: tiny bankroll, big trades
        wab.setWeightClass(1, _class(0.01 ether, 5 ether, 0.2 ether, 0.5 ether));
        wab.setOperator(operator);
        wab.fundHouse{value: 3 ether}();
        vm.startPrank(operator);
        fA = wab.registerFighter(owner, 0, keccak256("kiln"));
        fB = wab.registerFighter(owner, 0, keccak256("obsidian"));
        vm.stopPrank();
        for (uint256 i; i < 4; ++i) {
            vm.deal([alice, bob, carol, outsider][i], 100 ether);
        }
    }

    receive() external payable {}

    // ------------------------------------------------------------ helpers

    function _class(uint96 minTrade, uint96 maxTrade, uint96 bankroll, uint96 b)
        internal
        pure
        returns (WAB.WeightClass memory)
    {
        return WAB.WeightClass({
            minTrade: minTrade,
            maxTrade: maxTrade,
            bankroll: bankroll,
            liquidity: b,
            feeBps: 200,
            tradeWindow: 45,
            voteDuration: 45,
            settleGrace: 300,
            active: true,
            configHash: bytes32(0)
        });
    }

    function _create() internal returns (uint256 id) {
        return _createIn(0, fA, fB);
    }

    function _createIn(uint8 classId, uint32 a, uint32 b_) internal returns (uint256 id) {
        vm.prank(operator);
        id = wab.createMatch(classId, a, b_, keccak256("task"), uint40(block.timestamp + 60));
    }

    function _buy(address who, uint256 id, uint8 side, uint256 value) internal returns (uint256) {
        vm.prank(who);
        return wab.buy{value: value}(id, side, 0);
    }

    function _commit(uint256 id, uint8 round, bool swapped, uint8 tie) internal pure returns (bytes32) {
        return keccak256(abi.encode(id, round, swapped, tie, SALT));
    }

    /// Fight -> vote -> resolve one round. votesForA/B are cast by the given voters on the right blind labels.
    function _round(uint256 id, bool swapped, uint8 tie, address[] memory forA, address[] memory forB) internal {
        WAB.Match memory m = wab.matches(id);
        vm.warp(m.tradeEnd);
        uint8 round = m.round + 1;
        vm.prank(operator);
        wab.openVoting(id, _commit(id, round, swapped, tie), keccak256("pitches"));
        uint8 labelA = swapped ? 1 : 0;
        for (uint256 i; i < forA.length; ++i) {
            vm.prank(forA[i]);
            wab.vote(id, labelA);
        }
        for (uint256 i; i < forB.length; ++i) {
            vm.prank(forB[i]);
            wab.vote(id, 1 - labelA);
        }
        vm.warp(wab.matches(id).voteEnd);
        vm.prank(operator);
        wab.resolveRound(id, swapped, tie, SALT);
    }

    function _one(address x) internal pure returns (address[] memory r) {
        r = new address[](1);
        r[0] = x;
    }

    function _none() internal pure returns (address[] memory r) {}

    /// Contract MON = free house + everything backing live or unpaid matches.
    function _assertAccounting(uint256[] memory ids, uint256 outstanding) internal view {
        uint256 live;
        for (uint256 i; i < ids.length; ++i) {
            WAB.Match memory m = wab.matches(ids[i]);
            if (m.phase == WAB.Phase.Open || m.phase == WAB.Phase.Voting) live += m.pool + m.fees;
        }
        assertEq(address(wab).balance, wab.houseBalance() + live + outstanding, "accounting");
    }

    // ------------------------------------------------------- pricing

    function test_StartsAtFiftyFifty() public {
        uint256 id = _create();
        assertEq(wab.priceA(id), 0.5e18);
        assertEq(wab.stageOf(id), 1);
        assertTrue(wab.isTradingOpen(id));
        assertEq(wab.houseBalance(), 2 ether, "bankroll locked from house");
    }

    function test_BuyMatchesReferenceMath() public {
        uint256 id = _create();
        (uint256 qShares, uint256 qFee) = wab.quoteBuy(id, A, 0.1 ether);
        uint256 shares = _buy(alice, id, A, 0.1 ether);
        // reference values computed independently (Python, float64)
        assertApproxEqRel(shares, 0.1799038496e18, 1e12, "shares");
        assertEq(qFee, 0.002 ether, "fee is 2% at 50/50");
        assertEq(shares, qShares, "quote equals execution");
        assertApproxEqRel(wab.priceA(id), 0.588994e18, 1e13, "price moved up");
        (uint128 sa,,,,) = wab.positions(id, alice);
        assertEq(sa, shares);
    }

    function test_BuyingBPushesPriceDownSymmetrically() public {
        uint256 id = _create();
        uint256 sB = _buy(bob, id, B, 0.1 ether);
        assertApproxEqRel(sB, 0.1799038496e18, 1e12);
        assertApproxEqRel(wab.priceA(id), 1e18 - 0.588994e18, 1e13);
    }

    function test_RoundTripCostsOnlyFees() public {
        uint256 id = _create();
        uint256 shares = _buy(alice, id, A, 0.1 ether);
        uint256 before = alice.balance;
        vm.prank(alice);
        uint256 proceeds = wab.sell(id, A, shares, 0);
        assertEq(alice.balance - before, proceeds);
        assertApproxEqRel(proceeds, 0.0961020921e18, 1e12, "matches reference");
        assertApproxEqAbs(wab.priceA(id), 0.5e18, 1e9, "price back to 50/50");
    }

    function test_SlippageGuards() public {
        uint256 id = _create();
        (uint256 q,) = wab.quoteBuy(id, A, 0.1 ether);
        vm.prank(alice);
        vm.expectRevert(WAB.Slippage.selector);
        wab.buy{value: 0.1 ether}(id, A, q + 1);
        uint256 shares = _buy(alice, id, A, 0.1 ether);
        (uint256 out,) = wab.quoteSell(id, A, shares);
        vm.prank(alice);
        vm.expectRevert(WAB.Slippage.selector);
        wab.sell(id, A, shares, out + 1);
    }

    function test_TradeLimits() public {
        uint256 id = _create();
        vm.startPrank(alice);
        vm.expectRevert(WAB.TradeOutOfRange.selector);
        wab.buy{value: 0.009 ether}(id, A, 0);
        vm.expectRevert(WAB.TradeOutOfRange.selector);
        wab.buy{value: 0.11 ether}(id, A, 0);
        vm.expectRevert(WAB.BadSide.selector);
        wab.buy{value: 0.05 ether}(id, 2, 0);
        vm.expectRevert(WAB.NotEnoughShares.selector);
        wab.sell(id, A, 1, 0);
        vm.stopPrank();
    }

    // ----------------------------------------- the five-stage flow

    /// The user story: bet at 50/50, your robot wins round 1, the price jumps to 75%, you cash out at a profit.
    function test_CashOutAfterWinningRoundOne() public {
        uint256 id = _create();
        uint256 shares = _buy(alice, id, A, 0.1 ether);
        _buy(bob, id, B, 0.05 ether);

        _round(id, false, A, _one(alice), _none());
        assertEq(wab.stageOf(id), 3, "aspects round next");
        assertApproxEqAbs(wab.priceA(id), 0.75e18, 1e9, "re-anchored to 75%");
        assertTrue(wab.isTradingOpen(id), "trading reopened");

        (uint256 quoted,) = wab.quoteSell(id, A, shares);
        vm.prank(alice);
        uint256 proceeds = wab.sell(id, A, shares, 0);
        assertEq(proceeds, quoted);
        assertGt(proceeds, 0.1 ether, "cashed out at a profit");
    }

    function test_LateBuyerGetsFewerShares() public {
        uint256 id = _create();
        uint256 early = _buy(alice, id, A, 0.1 ether);
        _round(id, false, A, _one(alice), _none());
        uint256 late = _buy(carol, id, A, 0.1 ether);
        assertLt(late, early);
        assertApproxEqRel(late, 0.1274472125e18, 2e15, "reference at 75%, after alice's impact was reset");
    }

    function test_TwoNilEndsMatchAndPaysOneMonPerShare() public {
        uint256 id = _create();
        uint256 sA = _buy(alice, id, A, 0.1 ether);
        _buy(bob, id, B, 0.1 ether);
        address[] memory both = new address[](2);
        both[0] = alice;
        both[1] = bob;

        _round(id, false, B, both, _none()); // 2-0 votes for A
        _round(id, true, B, _one(alice), _none()); // labels swapped: alice still votes for A's pitch

        WAB.Match memory m = wab.matches(id);
        assertEq(uint8(m.phase), uint8(WAB.Phase.Resolved), "MVP round skipped");
        assertEq(m.winsA, 2);
        assertEq(m.round, 2);
        assertEq(wab.stageOf(id), 5);
        (uint32 w,,,,) = _fighter(fA);
        (, uint32 l,,,) = _fighter(fB);
        assertEq(w, 1);
        assertEq(l, 1);

        uint256 before = alice.balance;
        vm.prank(alice);
        assertEq(wab.claim(id), sA);
        assertEq(alice.balance - before, sA, "exactly 1 MON per share");

        vm.prank(bob);
        vm.expectRevert(WAB.NothingToClaim.selector);
        wab.claim(id);
        vm.prank(alice);
        vm.expectRevert(WAB.AlreadySettled.selector);
        wab.claim(id);

        uint256[] memory ids = new uint256[](1);
        ids[0] = id;
        _assertAccounting(ids, 0);
    }

    function test_OneAllGoesToMvp() public {
        uint256 id = _create();
        _buy(alice, id, A, 0.1 ether);
        _buy(bob, id, B, 0.1 ether);
        _round(id, false, A, _one(alice), _none());
        _round(id, false, A, _none(), _one(bob));
        assertApproxEqAbs(wab.priceA(id), 0.5e18, 1e9, "level again");
        assertEq(wab.stageOf(id), 4, "MVP round");
        _round(id, false, A, _none(), _one(bob));
        WAB.Match memory m = wab.matches(id);
        assertEq(uint8(m.phase), uint8(WAB.Phase.Resolved));
        assertEq(m.winner, B);
        assertEq(m.round, 3);
    }

    function test_ReanchorIgnoresPriorTradingImpact() public {
        uint256 id = _create();
        for (uint256 i; i < 5; ++i) {
            _buy(carol, id, B, 0.1 ether); // pushes A well below 50%
        }
        assertLt(wab.priceA(id), 0.2e18);
        _round(id, false, A, _one(carol), _none()); // carol votes A anyway
        assertApproxEqAbs(wab.priceA(id), 0.75e18, 1e9);
    }

    // --------------------------------------------- opening odds

    /// Plays a whole match with nobody voting, so the committed tie-winner takes both rounds.
    function _quickMatch(uint32 a, uint32 b_, uint8 winner) internal {
        uint256 id = _createIn(0, a, b_);
        _round(id, false, winner, _none(), _none());
        _round(id, false, winner, _none(), _none());
    }

    function test_NewFightersOpenAtFiftyFifty() public view {
        assertEq(wab.roundOddsFor(fA, fB), 0.5e18);
        assertEq(wab.openingPriceA(fA, fB), 0.5e18);
    }

    function test_OpeningOddsComeFromFightHistory() public {
        vm.prank(operator);
        uint32 fC = wab.registerFighter(owner, 0, bytes32(0));
        _quickMatch(fA, fB, A); // A is now 1-0, C is 0-0

        // A: (1+1)/(1+2) = 2/3, C: 1/2. log5 -> 2/3 per round; best of 3 -> q^2(3-2q) = 20/27
        assertApproxEqAbs(wab.roundOddsFor(fA, fC), 666666666666666666, 1e3);
        uint256 id = _createIn(0, fA, fC);
        assertApproxEqRel(wab.priceA(id), 0.74074074074074074e18, 1e12, "favourite opens at 74%");
        assertApproxEqRel(wab.openingPriceA(fC, fA), 0.259259259259259259e18, 1e12, "mirror image");

        _buy(alice, id, A, 0.05 ether);
        _buy(bob, id, B, 0.05 ether);
        _round(id, false, A, _one(alice), _none());
        assertApproxEqRel(wab.priceA(id), 0.888888888888888888e18, 1e12, "1-0 up: 1-(1-q)^2");
        _round(id, false, A, _none(), _one(bob));
        assertApproxEqRel(wab.priceA(id), 0.666666666666666666e18, 1e12, "1-1: back to q");
    }

    function test_OpeningOddsAreClamped() public {
        _quickMatch(fA, fB, A);
        _quickMatch(fA, fB, A); // A 2-0, B 0-2 -> raw log5 0.9
        assertEq(wab.roundOddsFor(fA, fB), 0.8e18);
        assertEq(wab.roundOddsFor(fB, fA), 0.2e18);
        assertApproxEqRel(wab.openingPriceA(fA, fB), 0.896e18, 1e12);
    }

    function test_UnderdogPaysMoreShares() public {
        _quickMatch(fA, fB, A);
        uint256 id = _create(); // A favourite
        uint256 onFav = _buy(alice, id, A, 0.05 ether);
        uint256 onDog = _buy(bob, id, B, 0.05 ether);
        assertGt(onDog, onFav, "same MON buys more of the underdog");
    }

    // ------------------------------------------------------ windows

    function test_TradingClosedWhileFightingAndVoting() public {
        uint256 id = _create();
        _buy(alice, id, A, 0.05 ether);
        vm.warp(block.timestamp + 60);
        assertFalse(wab.isTradingOpen(id));
        assertEq(wab.stageOf(id), 2, "fighters work on the elevator pitch");
        vm.prank(bob);
        vm.expectRevert(WAB.TradingClosed.selector);
        wab.buy{value: 0.05 ether}(id, A, 0);

        vm.prank(operator);
        wab.openVoting(id, _commit(id, 1, false, A), bytes32(0));
        vm.prank(bob);
        vm.expectRevert(WAB.WrongPhase.selector);
        wab.buy{value: 0.05 ether}(id, A, 0);
        vm.prank(alice);
        vm.expectRevert(WAB.WrongPhase.selector);
        wab.sell(id, A, 1, 0);
    }

    function test_OpenVotingTooEarly() public {
        uint256 id = _create();
        vm.prank(operator);
        vm.expectRevert(WAB.TooEarly.selector);
        wab.openVoting(id, _commit(id, 1, false, A), bytes32(0));
    }

    // ------------------------------------------------------- voting

    function test_VotingRules() public {
        uint256 id = _create();
        _buy(alice, id, A, 0.05 ether);
        vm.warp(block.timestamp + 60);
        vm.prank(operator);
        wab.openVoting(id, _commit(id, 1, false, A), bytes32(0));

        vm.prank(outsider);
        vm.expectRevert(WAB.NoPosition.selector);
        wab.vote(id, 0);

        vm.startPrank(alice);
        vm.expectRevert(WAB.BadLabel.selector);
        wab.vote(id, 2);
        wab.vote(id, 1);
        vm.expectRevert(WAB.AlreadyVoted.selector);
        wab.vote(id, 0);
        vm.stopPrank();
        (uint32 l0, uint32 l1) = wab.votes(id, 1);
        assertEq(l0, 0);
        assertEq(l1, 1);
    }

    function test_VoteAfterDeadlineRejected() public {
        uint256 id = _create();
        _buy(alice, id, A, 0.05 ether);
        vm.warp(block.timestamp + 60);
        vm.prank(operator);
        wab.openVoting(id, _commit(id, 1, false, A), bytes32(0));
        vm.warp(block.timestamp + 45);
        vm.prank(alice);
        vm.expectRevert(WAB.VotingClosed.selector);
        wab.vote(id, 0);
    }

    function test_BlindLabelsAreMappedByReveal() public {
        uint256 id = _create();
        _buy(alice, id, A, 0.05 ether);
        vm.warp(block.timestamp + 60);
        vm.prank(operator);
        wab.openVoting(id, _commit(id, 1, true, A), bytes32(0)); // label 0 = fighter B
        vm.prank(alice);
        wab.vote(id, 0);
        vm.warp(wab.matches(id).voteEnd);
        vm.prank(operator);
        wab.resolveRound(id, true, A, SALT);
        assertEq(wab.matches(id).winsB, 1, "label 0 counted for B");
    }

    function test_TieAndEmptyVoteGoToCommittedTieWinner() public {
        uint256 id = _create();
        _buy(alice, id, A, 0.05 ether);
        _buy(bob, id, B, 0.05 ether);
        _round(id, false, B, _one(alice), _one(bob)); // 1-1 tie
        assertEq(wab.matches(id).winsB, 1);
        _round(id, false, A, _none(), _none()); // nobody voted
        assertEq(wab.matches(id).winsA, 1);
    }

    function test_RevealMustMatchCommit() public {
        uint256 id = _create();
        _buy(alice, id, A, 0.05 ether);
        vm.warp(block.timestamp + 60);
        vm.prank(operator);
        wab.openVoting(id, _commit(id, 1, false, A), bytes32(0));
        vm.warp(block.timestamp + 45);
        vm.startPrank(operator);
        vm.expectRevert(WAB.BadReveal.selector);
        wab.resolveRound(id, true, A, SALT);
        vm.expectRevert(WAB.BadReveal.selector);
        wab.resolveRound(id, false, B, SALT);
        vm.expectRevert(WAB.BadReveal.selector);
        wab.resolveRound(id, false, A, keccak256("other"));
        vm.stopPrank();
    }

    // ---------------------------------------------------- solvency

    function test_RefusesBuysTheMatchCouldNotPay() public {
        uint256 id = _createIn(1, _reg(1), _reg(1));
        vm.prank(alice);
        vm.expectRevert(WAB.MarketFull.selector);
        wab.buy{value: 1 ether}(id, A, 0);
        _buy(alice, id, A, 0.1 ether); // small trades still fine
    }

    function test_SellCannotDrainOtherSidesPayout() public {
        uint256 id = _createIn(1, _reg(1), _reg(1));
        _buy(bob, id, B, 0.3 ether);
        WAB.Match memory m = wab.matches(id);
        assertGe(m.pool, m.sharesB);
        uint256 sA = _buy(alice, id, A, 0.2 ether);
        vm.prank(alice);
        wab.sell(id, A, sA, 0);
        m = wab.matches(id);
        assertGe(m.pool, m.sharesB, "bob's shares still fully backed");
    }

    function testFuzz_AlwaysSolventAndBalanced(uint256 seed) public {
        uint256 id = _create();
        address[3] memory who = [alice, bob, carol];
        for (uint256 i; i < 30; ++i) {
            uint256 r = uint256(keccak256(abi.encode(seed, i)));
            address u = who[r % 3];
            uint8 side = uint8((r >> 8) % 2);
            if ((r >> 16) % 3 == 0) {
                (uint128 sa, uint128 sb,,,) = wab.positions(id, u);
                uint256 held = side == 0 ? sa : sb;
                if (held == 0) continue;
                uint256 amt = held * (((r >> 24) % 100) + 1) / 100;
                vm.prank(u);
                try wab.sell(id, side, amt, 0) {} catch {}
            } else {
                uint256 v = 0.01 ether + (r >> 32) % 0.09 ether;
                vm.prank(u);
                try wab.buy{value: v}(id, side, 0) {} catch {}
            }
            WAB.Match memory m = wab.matches(id);
            assertGe(m.pool, m.sharesA > m.sharesB ? m.sharesA : m.sharesB, "solvent");
        }
        uint256[] memory ids = new uint256[](1);
        ids[0] = id;
        _assertAccounting(ids, 0);

        // finish the match; after every winner claims, only free house MON remains
        _round(id, false, uint8(seed % 2), _none(), _none());
        _round(id, false, uint8(seed % 2), _none(), _none());
        uint8 winner = wab.matches(id).winner;
        for (uint256 i; i < 3; ++i) {
            (uint128 sa, uint128 sb,,,) = wab.positions(id, who[i]);
            if ((winner == 0 ? sa : sb) > 0) {
                vm.prank(who[i]);
                wab.claim(id);
            }
        }
        assertEq(address(wab).balance, wab.houseBalance(), "all paid, rest back to house");
    }

    // -------------------------------------------------- cancellation

    function test_StalledMatchRefundsNetDeposits() public {
        uint256 id = _create();
        _buy(alice, id, A, 0.1 ether);
        uint256 sB = _buy(bob, id, B, 0.1 ether);
        vm.prank(bob);
        uint256 got = wab.sell(id, B, sB / 2, 0);

        vm.expectRevert(WAB.NotExpired.selector);
        wab.cancelExpired(id);
        vm.warp(wab.matches(id).deadline + 1);
        vm.prank(outsider);
        wab.cancelExpired(id);

        uint256 a0 = alice.balance;
        vm.prank(alice);
        wab.refund(id);
        assertEq(alice.balance - a0, 0.1 ether, "alice gets everything back, fee included");
        uint256 b0 = bob.balance;
        vm.prank(bob);
        wab.refund(id);
        assertEq(bob.balance - b0, 0.1 ether - got, "bob gets what he put in minus what he took out");
        vm.prank(bob);
        vm.expectRevert(WAB.AlreadySettled.selector);
        wab.refund(id);
        assertEq(address(wab).balance, wab.houseBalance(), "rest returned to house");
    }

    // ------------------------------------------------- access + house

    function test_RolesAndHouse() public {
        vm.prank(alice);
        vm.expectRevert(WAB.NotOperator.selector);
        wab.createMatch(0, fA, fB, bytes32(0), uint40(block.timestamp + 60));
        vm.prank(alice);
        vm.expectRevert(WAB.NotOwner.selector);
        wab.setWeightClass(0, _class(1, 2, 3, 4));
        vm.prank(alice);
        vm.expectRevert(WAB.NotTreasury.selector);
        wab.withdrawHouse(1);

        vm.prank(operator);
        vm.expectRevert(WAB.SameFighter.selector);
        wab.createMatch(0, fA, fA, bytes32(0), uint40(block.timestamp + 60));

        _create();
        _create();
        _create();
        vm.prank(operator);
        vm.expectRevert(WAB.HouseTooSmall.selector);
        wab.createMatch(0, fA, fB, bytes32(0), uint40(block.timestamp + 60));

        wab.setPaused(true);
        wab.fundHouse{value: 1 ether}();
        vm.prank(operator);
        vm.expectRevert(WAB.Paused.selector);
        wab.createMatch(0, fA, fB, bytes32(0), uint40(block.timestamp + 60));

        uint256 before = address(this).balance;
        wab.withdrawHouse(1 ether);
        assertEq(address(this).balance - before, 1 ether);
        vm.expectRevert(WAB.InsufficientHouse.selector);
        wab.withdrawHouse(1);
    }

    function test_ReentrantSellIsBlocked() public {
        uint256 id = _create();
        Reenter attacker = new Reenter(wab, id);
        vm.deal(address(attacker), 1 ether);
        attacker.buyIn();
        vm.expectRevert(WAB.TransferFailed.selector);
        attacker.cashOut();
    }

    // ------------------------------------------------------- utils

    function _fighter(uint32 id) internal view returns (uint32 wins, uint32 losses, uint8, address, bytes32) {
        (address o, uint8 c, uint32 w, uint32 l, bytes32 h) = wab.fighters(id);
        return (w, l, c, o, h);
    }

    function _reg(uint8 classId) internal returns (uint32 id) {
        vm.prank(operator);
        id = wab.registerFighter(owner, classId, bytes32(0));
    }
}

contract Reenter {
    WAB wab;
    uint256 id;
    uint256 shares;

    constructor(WAB w, uint256 i) {
        wab = w;
        id = i;
    }

    function buyIn() external {
        shares = wab.buy{value: 0.1 ether}(id, 0, 0);
    }

    function cashOut() external {
        wab.sell(id, 0, shares / 2, 0);
    }

    receive() external payable {
        wab.sell(id, 0, shares / 2, 0); // tries to sell again mid-payout
    }
}
