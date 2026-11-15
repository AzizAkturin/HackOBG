// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {FightClub} from "../src/FightClub.sol";

contract ReentrantClaimer {
    FightClub immutable club;
    uint256 public roundId;
    bool public reentryAttempted;
    bool public reentrySucceeded;

    constructor(FightClub c) {
        club = c;
    }

    function enter(uint256 id, uint8 idx) external payable {
        roundId = id;
        club.enter{value: msg.value}(id, idx);
    }

    function claim() external {
        club.claim(roundId);
    }

    function refund() external {
        club.refund(roundId);
    }

    receive() external payable {
        if (reentryAttempted) return;
        reentryAttempted = true;
        try club.claim(roundId) {
            reentrySucceeded = true;
        } catch {}
        try club.refund(roundId) {
            reentrySucceeded = true;
        } catch {}
    }
}

contract RejectingReceiver {
    function enter(FightClub club, uint256 id, uint8 idx) external payable {
        club.enter{value: msg.value}(id, idx);
    }

    function claim(FightClub club, uint256 id) external {
        club.claim(id);
    }
}

contract FightClubTest is Test {
    FightClub club;
    address owner = makeAddr("owner");
    address operator = makeAddr("operator");
    address treasury = makeAddr("treasury");
    address house = makeAddr("house");
    address stranger = makeAddr("stranger");

    uint8 constant CLASS = 0;
    uint96 constant MIN_BET = 0.1 ether;
    uint96 constant MAX_BET = 5 ether;
    uint32 constant VOTE = 60;
    uint32 constant GRACE = 300;
    bytes32 constant SALT = keccak256("salt");

    function setUp() public {
        vm.warp(1_000_000);
        vm.startPrank(owner);
        club = new FightClub();
        club.setWeightClass(CLASS, _class(MIN_BET, MAX_BET, 500));
        club.setOperator(operator);
        club.setTreasury(treasury);
        vm.stopPrank();
    }

    function _class(uint96 minBet, uint96 maxBet, uint16 rakeBps) internal pure returns (FightClub.WeightClass memory) {
        return FightClub.WeightClass({
            minBet: minBet,
            maxBet: maxBet,
            rakeBps: rakeBps,
            voteDuration: VOTE,
            settleGrace: GRACE,
            active: true,
            configHash: bytes32(0)
        });
    }

    function _fighters(uint256 n) internal returns (uint32[] memory ids) {
        ids = new uint32[](n);
        vm.startPrank(operator);
        for (uint256 i; i < n; ++i) {
            ids[i] = club.registerFighter(house, CLASS, keccak256(abi.encode(i)));
        }
        vm.stopPrank();
    }

    function _round(uint256 n) internal returns (uint256 roundId) {
        uint32[] memory ids = _fighters(n);
        vm.prank(operator);
        roundId = club.createRound(CLASS, ids, keccak256("task"), uint40(block.timestamp + 100));
    }

    function _bettor(string memory name) internal returns (address a) {
        a = makeAddr(name);
        vm.deal(a, 100 ether);
    }

    function _bet(address user, uint256 roundId, uint8 idx, uint256 amount) internal {
        vm.prank(user);
        club.enter{value: amount}(roundId, idx);
    }

    function _identity(uint256 n) internal pure returns (uint8[] memory xs) {
        xs = new uint8[](n);
        for (uint256 i; i < n; ++i) {
            xs[i] = uint8(i);
        }
    }

    function _arr(uint8 a, uint8 b, uint8 c, uint8 d) internal pure returns (uint8[] memory xs) {
        xs = new uint8[](4);
        (xs[0], xs[1], xs[2], xs[3]) = (a, b, c, d);
    }

    function _commit(uint256 roundId, uint8[] memory labelToIndex, uint8[] memory judgeRank)
        internal
        pure
        returns (bytes32)
    {
        return keccak256(abi.encode(roundId, labelToIndex, judgeRank, SALT));
    }

    function _lockAndOpen(uint256 roundId, uint8[] memory labelToIndex, uint8[] memory judgeRank) internal {
        vm.warp(club.rounds(roundId).lockTime);
        vm.prank(operator);
        club.openVoting(roundId, _commit(roundId, labelToIndex, judgeRank), keccak256("pitches"));
    }

    function _settle(uint256 roundId, uint8[] memory labelToIndex, uint8[] memory judgeRank) internal {
        vm.warp(club.rounds(roundId).voteEnd);
        vm.prank(operator);
        club.settle(roundId, labelToIndex, judgeRank, SALT);
    }

    function _vote(address user, uint256 roundId, uint8 label) internal {
        vm.prank(user);
        club.vote(roundId, label);
    }

    function test_workedExample_payoutMatchesSpec() public {
        uint256 id = _round(4);
        address alice = _bettor("alice");
        address bob = _bettor("bob");
        _bet(alice, id, 0, 0.5 ether);
        _bet(bob, id, 0, 0.5 ether);
        _bet(_bettor("c"), id, 1, 2 ether);
        _bet(_bettor("d"), id, 2, 3 ether);
        _bet(_bettor("e"), id, 3, 4 ether);
        assertEq(club.rounds(id).totalPool, 10 ether);

        uint8[] memory perm = _identity(4);
        _lockAndOpen(id, perm, perm);
        _vote(alice, id, 0);
        _settle(id, perm, perm);

        FightClub.Round memory r = club.rounds(id);
        assertEq(r.winnerIndex, 0);
        assertEq(r.rake, 0.5 ether);
        assertEq(club.accruedRake(), 0.5 ether);

        uint256 before = alice.balance;
        vm.prank(alice);
        club.claim(id);
        assertEq(alice.balance - before, 4.75 ether);

        before = bob.balance;
        vm.prank(bob);
        club.claim(id);
        assertEq(bob.balance - before, 4.75 ether);

        vm.prank(treasury);
        club.withdrawRake(0.5 ether);
        assertEq(treasury.balance, 0.5 ether);
        assertEq(address(club).balance, 0);
    }

    function test_enter_emitsPostBetPools() public {
        uint256 id = _round(2);
        address a = _bettor("a");
        _bet(_bettor("b"), id, 1, 1 ether);
        vm.expectEmit(address(club));
        emit FightClub.Entered(id, a, 0, 0.3 ether, 0.3 ether, 1.3 ether);
        _bet(a, id, 0, 0.3 ether);
    }

    function test_enter_topUpSameFighterAccumulates() public {
        uint256 id = _round(2);
        address a = _bettor("a");
        _bet(a, id, 1, 0.1 ether);
        _bet(a, id, 1, 0.4 ether);
        (uint128 amount, uint8 idx,,) = club.entries(id, a);
        assertEq(amount, 0.5 ether);
        assertEq(idx, 1);
        assertEq(club.poolByIndex(id, 1), 0.5 ether);
    }

    function test_enter_topUpDifferentFighterReverts() public {
        uint256 id = _round(2);
        address a = _bettor("a");
        _bet(a, id, 0, 0.1 ether);
        vm.prank(a);
        vm.expectRevert(FightClub.DifferentFighter.selector);
        club.enter{value: 0.1 ether}(id, 1);
    }

    function test_enter_belowMinReverts() public {
        uint256 id = _round(2);
        vm.prank(_bettor("a"));
        vm.expectRevert(FightClub.BetOutOfRange.selector);
        club.enter{value: MIN_BET - 1}(id, 0);
    }

    function test_enter_aboveMaxReverts() public {
        uint256 id = _round(2);
        vm.prank(_bettor("a"));
        vm.expectRevert(FightClub.BetOutOfRange.selector);
        club.enter{value: MAX_BET + 1}(id, 0);
    }

    function test_enter_topUpPastMaxReverts() public {
        uint256 id = _round(2);
        address a = _bettor("a");
        _bet(a, id, 0, MAX_BET);
        vm.prank(a);
        vm.expectRevert(FightClub.BetOutOfRange.selector);
        club.enter{value: 1}(id, 0);
    }

    function test_enter_zeroValueReverts() public {
        uint256 id = _round(2);
        address a = _bettor("a");
        _bet(a, id, 0, MIN_BET);
        vm.prank(a);
        vm.expectRevert(FightClub.ZeroValue.selector);
        club.enter{value: 0}(id, 0);
    }

    function test_enter_badFighterIndexReverts() public {
        uint256 id = _round(2);
        vm.prank(_bettor("a"));
        vm.expectRevert(FightClub.BadFighterIndex.selector);
        club.enter{value: MIN_BET}(id, 2);
    }

    function test_enter_afterLockReverts() public {
        uint256 id = _round(2);
        vm.warp(club.rounds(id).lockTime);
        vm.prank(_bettor("a"));
        vm.expectRevert(FightClub.BettingClosed.selector);
        club.enter{value: MIN_BET}(id, 0);
    }

    function test_enter_unknownRoundReverts() public {
        vm.prank(_bettor("a"));
        vm.expectRevert(FightClub.WrongPhase.selector);
        club.enter{value: MIN_BET}(42, 0);
    }

    function test_enter_duringVotingReverts() public {
        uint256 id = _round(2);
        _lockAndOpen(id, _identity(2), _identity(2));
        vm.prank(_bettor("a"));
        vm.expectRevert(FightClub.WrongPhase.selector);
        club.enter{value: MIN_BET}(id, 0);
    }

    function test_roundSnapshotsClassAgainstOwnerEdits() public {
        uint256 id = _round(2);
        vm.prank(owner);
        club.setWeightClass(CLASS, _class(1 ether, 10 ether, 1000));

        address a = _bettor("a");
        _bet(a, id, 0, MIN_BET);
        vm.prank(a);
        vm.expectRevert(FightClub.BetOutOfRange.selector);
        club.enter{value: MAX_BET}(id, 0);

        _bet(_bettor("b"), id, 1, 1 ether);
        _lockAndOpen(id, _identity(2), _identity(2));
        _settle(id, _identity(2), _identity(2));
        assertEq(club.rounds(id).rake, uint256(1.1 ether) * 500 / 10_000);
    }

    function test_paused_blocksCreateRoundAndEnterOnly() public {
        uint256 id = _round(2);
        address a = _bettor("a");
        address b = _bettor("b");
        _bet(a, id, 0, 1 ether);
        _bet(b, id, 1, 1 ether);
        uint32[] memory ids = _fighters(2);

        vm.prank(owner);
        club.setPaused(true);

        vm.prank(operator);
        vm.expectRevert(FightClub.Paused.selector);
        club.createRound(CLASS, ids, bytes32(0), uint40(block.timestamp + 100));

        vm.prank(a);
        vm.expectRevert(FightClub.Paused.selector);
        club.enter{value: 1 ether}(id, 0);

        _lockAndOpen(id, _identity(2), _identity(2));
        _vote(a, id, 0);
        _settle(id, _identity(2), _identity(2));
        vm.prank(a);
        club.claim(id);
        uint256 rake = club.accruedRake();
        vm.prank(treasury);
        club.withdrawRake(rake);
    }

    function test_paused_doesNotBlockCancelOrRefund() public {
        uint256 id = _round(2);
        address a = _bettor("a");
        _bet(a, id, 0, 1 ether);
        vm.prank(owner);
        club.setPaused(true);
        vm.prank(operator);
        club.cancel(id);
        vm.prank(a);
        club.refund(id);
        assertEq(a.balance, 100 ether);
    }

    function test_createRound_validatesInputs() public {
        uint32[] memory one = _fighters(1);
        uint32[] memory nine = _fighters(9);
        uint32[] memory two = _fighters(2);
        uint40 lock = uint40(block.timestamp + 100);

        vm.startPrank(operator);
        vm.expectRevert(FightClub.BadFighterCount.selector);
        club.createRound(CLASS, one, bytes32(0), lock);
        vm.expectRevert(FightClub.BadFighterCount.selector);
        club.createRound(CLASS, nine, bytes32(0), lock);

        uint32[] memory dup = new uint32[](2);
        (dup[0], dup[1]) = (two[0], two[0]);
        vm.expectRevert(FightClub.DuplicateFighter.selector);
        club.createRound(CLASS, dup, bytes32(0), lock);

        uint32[] memory unknown = new uint32[](2);
        (unknown[0], unknown[1]) = (two[0], 999);
        vm.expectRevert(FightClub.UnknownFighter.selector);
        club.createRound(CLASS, unknown, bytes32(0), lock);

        vm.expectRevert(FightClub.BadLockTime.selector);
        club.createRound(CLASS, two, bytes32(0), uint40(block.timestamp));

        vm.expectRevert(FightClub.ClassInactive.selector);
        club.createRound(7, two, bytes32(0), lock);
        vm.stopPrank();

        vm.prank(owner);
        club.setWeightClass(1, _class(MIN_BET, MAX_BET, 500));
        vm.prank(operator);
        vm.expectRevert(FightClub.FighterClassMismatch.selector);
        club.createRound(1, two, bytes32(0), lock);

        vm.prank(operator);
        club.createRound(CLASS, two, bytes32(0), lock);
    }

    function test_createRound_acceptsEightFighters() public {
        uint256 id = _round(8);
        assertEq(club.rounds(id).fighterCount, 8);
        _bet(_bettor("a"), id, 7, MIN_BET);
    }

    function test_phaseOf_derivesFightingAfterLock() public {
        uint256 id = _round(2);
        assertEq(uint8(club.phaseOf(id)), uint8(FightClub.Phase.Open));
        vm.warp(club.rounds(id).lockTime);
        assertEq(uint8(club.phaseOf(id)), uint8(FightClub.Phase.Fighting));
        assertEq(uint8(club.rounds(id).phase), uint8(FightClub.Phase.Open));
    }

    function test_settleDeadline_beforeAndAfterOpenVoting() public {
        uint256 id = _round(2);
        FightClub.Round memory r = club.rounds(id);
        assertEq(r.settleDeadline, r.lockTime + 600 + VOTE + GRACE);

        vm.warp(r.lockTime + 250);
        vm.prank(operator);
        club.openVoting(id, _commit(id, _identity(2), _identity(2)), keccak256("p"));
        r = club.rounds(id);
        assertEq(r.voteEnd, block.timestamp + VOTE);
        assertEq(r.settleDeadline, block.timestamp + VOTE + GRACE);
        assertEq(uint8(r.phase), uint8(FightClub.Phase.Voting));
    }

    function test_openVoting_rejectsEarlyExpiredZeroAndRepeat() public {
        uint256 id = _round(2);
        bytes32 commit = _commit(id, _identity(2), _identity(2));

        vm.startPrank(operator);
        vm.expectRevert(FightClub.TooEarly.selector);
        club.openVoting(id, commit, bytes32(0));

        vm.warp(club.rounds(id).lockTime);
        vm.expectRevert(FightClub.ZeroCommit.selector);
        club.openVoting(id, bytes32(0), bytes32(0));

        uint256 snap = vm.snapshotState();
        vm.warp(club.rounds(id).settleDeadline + 1);
        vm.expectRevert(FightClub.Expired.selector);
        club.openVoting(id, commit, bytes32(0));
        vm.revertToState(snap);

        club.openVoting(id, commit, bytes32(0));
        vm.expectRevert(FightClub.WrongPhase.selector);
        club.openVoting(id, commit, bytes32(0));
        vm.stopPrank();
    }

    function test_vote_requiresEntry() public {
        uint256 id = _round(2);
        _lockAndOpen(id, _identity(2), _identity(2));
        vm.prank(stranger);
        vm.expectRevert(FightClub.NoEntry.selector);
        club.vote(id, 0);
    }

    function test_vote_onlyOnce() public {
        uint256 id = _round(2);
        address a = _bettor("a");
        _bet(a, id, 0, MIN_BET);
        _lockAndOpen(id, _identity(2), _identity(2));
        _vote(a, id, 1);
        vm.prank(a);
        vm.expectRevert(FightClub.AlreadyVoted.selector);
        club.vote(id, 0);
        assertEq(club.votesByLabel(id, 1), 1);
        assertEq(club.votesByLabel(id, 0), 0);
    }

    function test_vote_rejectsBadLabelWrongPhaseAndLate() public {
        uint256 id = _round(2);
        address a = _bettor("a");
        _bet(a, id, 0, MIN_BET);

        vm.prank(a);
        vm.expectRevert(FightClub.WrongPhase.selector);
        club.vote(id, 0);

        _lockAndOpen(id, _identity(2), _identity(2));
        vm.prank(a);
        vm.expectRevert(FightClub.BadLabel.selector);
        club.vote(id, 2);

        vm.warp(club.rounds(id).voteEnd);
        vm.prank(a);
        vm.expectRevert(FightClub.VotingClosed.selector);
        club.vote(id, 0);
    }

    function test_vote_isNotStakeWeighted() public {
        uint256 id = _round(2);
        address whale = _bettor("whale");
        address s1 = _bettor("s1");
        address s2 = _bettor("s2");
        _bet(whale, id, 0, MAX_BET);
        _bet(s1, id, 1, MIN_BET);
        _bet(s2, id, 1, MIN_BET);
        _lockAndOpen(id, _identity(2), _identity(2));
        _vote(whale, id, 0);
        _vote(s1, id, 1);
        _vote(s2, id, 1);
        _settle(id, _identity(2), _identity(2));
        assertEq(club.rounds(id).winnerIndex, 1);
    }

    function test_settle_mapsShuffledLabelsToFighters() public {
        uint256 id = _round(4);
        address[3] memory voters = [_bettor("a"), _bettor("b"), _bettor("c")];
        for (uint256 i; i < 3; ++i) {
            _bet(voters[i], id, 0, MIN_BET);
        }
        uint8[] memory labelToIndex = _arr(2, 3, 1, 0);
        uint8[] memory judgeRank = _arr(0, 1, 2, 3);
        _lockAndOpen(id, labelToIndex, judgeRank);
        _vote(voters[0], id, 0);
        _vote(voters[1], id, 0);
        _vote(voters[2], id, 3);
        _settle(id, labelToIndex, judgeRank);
        assertEq(club.rounds(id).winnerIndex, 2);
    }

    function test_settle_tieGoesToBestJudgeRank() public {
        uint256 id = _round(4);
        address a = _bettor("a");
        address b = _bettor("b");
        _bet(a, id, 0, MIN_BET);
        _bet(b, id, 0, MIN_BET);
        uint8[] memory perm = _identity(4);
        uint8[] memory judgeRank = _arr(3, 2, 1, 0);
        _lockAndOpen(id, perm, judgeRank);
        _vote(a, id, 1);
        _vote(b, id, 2);
        _settle(id, perm, judgeRank);
        assertEq(club.rounds(id).winnerIndex, 2);
    }

    function test_settle_zeroVotesPicksJudgeTop() public {
        uint256 id = _round(4);
        uint8[] memory perm = _identity(4);
        uint8[] memory judgeRank = _arr(3, 0, 1, 2);
        _bet(_bettor("a"), id, 3, MIN_BET);
        _lockAndOpen(id, perm, judgeRank);
        _settle(id, perm, judgeRank);
        assertEq(club.rounds(id).winnerIndex, 3);
    }

    function test_settle_updatesWinsAndLosses() public {
        uint32[] memory ids = _fighters(3);
        vm.prank(operator);
        uint256 id = club.createRound(CLASS, ids, bytes32(0), uint40(block.timestamp + 100));
        uint8[] memory perm = _identity(3);
        uint8[] memory judgeRank = new uint8[](3);
        (judgeRank[0], judgeRank[1], judgeRank[2]) = (1, 0, 2);
        _lockAndOpen(id, perm, judgeRank);
        vm.expectEmit(address(club));
        emit FightClub.Settled(id, 1, ids[1], perm, 0, 0, true);
        _settle(id, perm, judgeRank);

        (,, uint32 w0, uint32 l0,) = club.fighters(ids[0]);
        (,, uint32 w1, uint32 l1,) = club.fighters(ids[1]);
        (,, uint32 w2, uint32 l2,) = club.fighters(ids[2]);
        assertEq(abi.encode(w0, l0, w1, l1, w2, l2), abi.encode(0, 1, 1, 0, 0, 1));
    }

    function test_settle_rejectsWrongReveal() public {
        uint256 id = _round(2);
        uint8[] memory perm = _identity(2);
        _lockAndOpen(id, perm, perm);
        vm.warp(club.rounds(id).voteEnd);
        vm.startPrank(operator);
        vm.expectRevert(FightClub.BadReveal.selector);
        club.settle(id, perm, perm, keccak256("other salt"));

        uint8[] memory swapped = new uint8[](2);
        (swapped[0], swapped[1]) = (1, 0);
        vm.expectRevert(FightClub.BadReveal.selector);
        club.settle(id, swapped, perm, SALT);
        vm.stopPrank();
    }

    function test_settle_rejectsNonPermutations() public {
        uint8[3][4] memory bad = [[0, 0, 1], [0, 1, 3], [2, 1, 1], [1, 2, 2]];
        for (uint256 k; k < bad.length; ++k) {
            uint8[] memory xs = new uint8[](3);
            (xs[0], xs[1], xs[2]) = (bad[k][0], bad[k][1], bad[k][2]);
            _expectSettleRevertsNotPermutation(xs, _identity(3));
            _expectSettleRevertsNotPermutation(_identity(3), xs);
        }
        _expectSettleRevertsNotPermutation(_identity(2), _identity(3));
        _expectSettleRevertsNotPermutation(_identity(3), _identity(4));
    }

    function _expectSettleRevertsNotPermutation(uint8[] memory labelToIndex, uint8[] memory judgeRank) internal {
        uint256 id = _round(3);
        _lockAndOpen(id, labelToIndex, judgeRank);
        vm.warp(club.rounds(id).voteEnd);
        vm.prank(operator);
        vm.expectRevert(FightClub.NotPermutation.selector);
        club.settle(id, labelToIndex, judgeRank, SALT);
    }

    function test_settle_rejectsEarlyLateAndWrongPhase() public {
        uint256 id = _round(2);
        uint8[] memory perm = _identity(2);

        vm.prank(operator);
        vm.expectRevert(FightClub.WrongPhase.selector);
        club.settle(id, perm, perm, SALT);

        _lockAndOpen(id, perm, perm);
        vm.prank(operator);
        vm.expectRevert(FightClub.TooEarly.selector);
        club.settle(id, perm, perm, SALT);

        uint256 snap = vm.snapshotState();
        vm.warp(club.rounds(id).settleDeadline + 1);
        vm.prank(operator);
        vm.expectRevert(FightClub.Expired.selector);
        club.settle(id, perm, perm, SALT);
        vm.revertToState(snap);

        _settle(id, perm, perm);
        vm.prank(operator);
        vm.expectRevert(FightClub.WrongPhase.selector);
        club.settle(id, perm, perm, SALT);
    }

    function test_refundMode_whenNobodyBackedWinner() public {
        uint256 id = _round(3);
        address a = _bettor("a");
        address b = _bettor("b");
        _bet(a, id, 0, 1 ether);
        _bet(b, id, 1, 2 ether);
        uint8[] memory perm = _identity(3);
        uint8[] memory judgeRank = new uint8[](3);
        (judgeRank[0], judgeRank[1], judgeRank[2]) = (2, 0, 1);
        _lockAndOpen(id, perm, judgeRank);
        _settle(id, perm, judgeRank);

        FightClub.Round memory r = club.rounds(id);
        assertEq(r.winnerIndex, 2);
        assertEq(uint8(r.phase), uint8(FightClub.Phase.Settled));
        assertEq(r.rake, 0);
        assertEq(club.accruedRake(), 0);

        vm.prank(a);
        vm.expectRevert(FightClub.RefundMode.selector);
        club.claim(id);

        vm.prank(a);
        club.refund(id);
        vm.prank(b);
        club.refund(id);
        assertEq(a.balance, 100 ether);
        assertEq(b.balance, 100 ether);
        assertEq(address(club).balance, 0);
    }

    function test_refund_rejectedForNormalSettledRound() public {
        uint256 id = _round(2);
        address a = _bettor("a");
        _bet(a, id, 0, 1 ether);
        _lockAndOpen(id, _identity(2), _identity(2));
        _settle(id, _identity(2), _identity(2));
        vm.prank(a);
        vm.expectRevert(FightClub.NotRefundable.selector);
        club.refund(id);
    }

    function test_claim_rejectsLoserStrangerRepeatAndUnsettled() public {
        uint256 id = _round(2);
        address w = _bettor("w");
        address l = _bettor("l");
        _bet(w, id, 0, 1 ether);
        _bet(l, id, 1, 1 ether);

        vm.prank(w);
        vm.expectRevert(FightClub.WrongPhase.selector);
        club.claim(id);

        _lockAndOpen(id, _identity(2), _identity(2));
        _settle(id, _identity(2), _identity(2));

        vm.prank(l);
        vm.expectRevert(FightClub.NotWinner.selector);
        club.claim(id);
        vm.prank(stranger);
        vm.expectRevert(FightClub.NotWinner.selector);
        club.claim(id);

        vm.prank(w);
        club.claim(id);
        vm.prank(w);
        vm.expectRevert(FightClub.AlreadyClaimed.selector);
        club.claim(id);
    }

    function test_cancel_beforeVotingRefundsInFull() public {
        uint256 id = _round(2);
        address a = _bettor("a");
        _bet(a, id, 0, 1 ether);
        vm.prank(operator);
        club.cancel(id);
        assertEq(uint8(club.rounds(id).phase), uint8(FightClub.Phase.Cancelled));
        vm.prank(a);
        club.refund(id);
        assertEq(a.balance, 100 ether);
        vm.prank(a);
        vm.expectRevert(FightClub.AlreadyClaimed.selector);
        club.refund(id);
    }

    function test_cancel_duringVotingRefundsInFull() public {
        uint256 id = _round(2);
        address a = _bettor("a");
        _bet(a, id, 1, 2 ether);
        _lockAndOpen(id, _identity(2), _identity(2));
        _vote(a, id, 1);
        vm.expectEmit(address(club));
        emit FightClub.RoundCancelled(id, operator);
        vm.prank(operator);
        club.cancel(id);
        vm.prank(a);
        club.refund(id);
        assertEq(a.balance, 100 ether);
    }

    function test_cancel_rejectedAfterSettleAndTwice() public {
        uint256 id = _round(2);
        _lockAndOpen(id, _identity(2), _identity(2));
        _settle(id, _identity(2), _identity(2));
        vm.prank(operator);
        vm.expectRevert(FightClub.WrongPhase.selector);
        club.cancel(id);

        uint256 id2 = _round(2);
        vm.startPrank(operator);
        club.cancel(id2);
        vm.expectRevert(FightClub.WrongPhase.selector);
        club.cancel(id2);
        vm.stopPrank();
    }

    function test_refund_rejectedWithoutEntryOrBeforeCancel() public {
        uint256 id = _round(2);
        address a = _bettor("a");
        _bet(a, id, 0, 1 ether);
        vm.prank(a);
        vm.expectRevert(FightClub.NotRefundable.selector);
        club.refund(id);
        vm.prank(operator);
        club.cancel(id);
        vm.prank(stranger);
        vm.expectRevert(FightClub.NoEntry.selector);
        club.refund(id);
    }

    function test_cancelExpired_beforeVotingOpens() public {
        uint256 id = _round(2);
        address a = _bettor("a");
        _bet(a, id, 0, 1 ether);
        uint40 deadline = club.rounds(id).settleDeadline;

        vm.warp(deadline);
        vm.prank(stranger);
        vm.expectRevert(FightClub.NotExpired.selector);
        club.cancelExpired(id);

        vm.warp(deadline + 1);
        vm.expectEmit(address(club));
        emit FightClub.RoundCancelled(id, stranger);
        vm.prank(stranger);
        club.cancelExpired(id);
        vm.prank(a);
        club.refund(id);
        assertEq(a.balance, 100 ether);
    }

    function test_cancelExpired_afterVotingOpens() public {
        uint256 id = _round(2);
        address a = _bettor("a");
        _bet(a, id, 0, 1 ether);
        vm.warp(club.rounds(id).lockTime + 500);
        vm.prank(operator);
        club.openVoting(id, _commit(id, _identity(2), _identity(2)), bytes32(0));
        uint40 deadline = club.rounds(id).settleDeadline;

        vm.warp(deadline);
        vm.prank(stranger);
        vm.expectRevert(FightClub.NotExpired.selector);
        club.cancelExpired(id);

        vm.warp(deadline + 1);
        vm.prank(stranger);
        club.cancelExpired(id);
        vm.prank(a);
        club.refund(id);
        assertEq(a.balance, 100 ether);
    }

    function test_cancelExpired_rejectedAfterSettle() public {
        uint256 id = _round(2);
        _lockAndOpen(id, _identity(2), _identity(2));
        _settle(id, _identity(2), _identity(2));
        vm.warp(club.rounds(id).settleDeadline + 1);
        vm.prank(stranger);
        vm.expectRevert(FightClub.WrongPhase.selector);
        club.cancelExpired(id);
    }

    function test_withdrawRake_cannotExceedAccrued() public {
        uint256 id = _round(2);
        _bet(_bettor("a"), id, 0, 1 ether);
        _lockAndOpen(id, _identity(2), _identity(2));
        _settle(id, _identity(2), _identity(2));
        uint256 rake = club.accruedRake();
        assertEq(rake, 0.05 ether);
        vm.startPrank(treasury);
        vm.expectRevert(FightClub.InsufficientRake.selector);
        club.withdrawRake(rake + 1);
        club.withdrawRake(rake);
        vm.stopPrank();
        assertEq(treasury.balance, rake);
    }

    function test_setWeightClass_rejectsInvalidParams() public {
        vm.startPrank(owner);
        vm.expectRevert(FightClub.InvalidClass.selector);
        club.setWeightClass(1, _class(0, 1 ether, 500));
        vm.expectRevert(FightClub.InvalidClass.selector);
        club.setWeightClass(1, _class(2 ether, 1 ether, 500));
        vm.expectRevert(FightClub.InvalidClass.selector);
        club.setWeightClass(1, _class(1 ether, 1 ether, 1001));
        vm.stopPrank();
    }

    function test_accessControl_ownerOnly() public {
        FightClub.WeightClass memory c = _class(MIN_BET, MAX_BET, 500);
        address[2] memory notOwner = [operator, stranger];
        for (uint256 i; i < notOwner.length; ++i) {
            vm.startPrank(notOwner[i]);
            vm.expectRevert(FightClub.NotOwner.selector);
            club.setWeightClass(1, c);
            vm.expectRevert(FightClub.NotOwner.selector);
            club.setOperator(stranger);
            vm.expectRevert(FightClub.NotOwner.selector);
            club.setTreasury(stranger);
            vm.expectRevert(FightClub.NotOwner.selector);
            club.setPaused(true);
            vm.stopPrank();
        }
    }

    function test_accessControl_operatorOnly() public {
        uint256 id = _round(2);
        uint32[] memory ids = _fighters(2);
        uint8[] memory perm = _identity(2);
        address[2] memory notOperator = [owner, stranger];
        for (uint256 i; i < notOperator.length; ++i) {
            vm.startPrank(notOperator[i]);
            vm.expectRevert(FightClub.NotOperator.selector);
            club.registerFighter(house, CLASS, bytes32(0));
            vm.expectRevert(FightClub.NotOperator.selector);
            club.createRound(CLASS, ids, bytes32(0), uint40(block.timestamp + 100));
            vm.expectRevert(FightClub.NotOperator.selector);
            club.openVoting(id, bytes32(uint256(1)), bytes32(0));
            vm.expectRevert(FightClub.NotOperator.selector);
            club.settle(id, perm, perm, SALT);
            vm.expectRevert(FightClub.NotOperator.selector);
            club.cancel(id);
            vm.stopPrank();
        }
    }

    function test_accessControl_treasuryOnly() public {
        address[3] memory notTreasury = [owner, operator, stranger];
        for (uint256 i; i < notTreasury.length; ++i) {
            vm.prank(notTreasury[i]);
            vm.expectRevert(FightClub.NotTreasury.selector);
            club.withdrawRake(0);
        }
    }

    function test_rotatedRolesTakeEffect() public {
        address newOp = makeAddr("newOp");
        address newTreasury = makeAddr("newTreasury");
        vm.startPrank(owner);
        club.setOperator(newOp);
        club.setTreasury(newTreasury);
        vm.expectRevert(FightClub.ZeroAddress.selector);
        club.setOperator(address(0));
        vm.expectRevert(FightClub.ZeroAddress.selector);
        club.setTreasury(address(0));
        vm.stopPrank();

        vm.prank(operator);
        vm.expectRevert(FightClub.NotOperator.selector);
        club.registerFighter(house, CLASS, bytes32(0));
        vm.prank(newOp);
        club.registerFighter(house, CLASS, bytes32(0));

        vm.prank(treasury);
        vm.expectRevert(FightClub.NotTreasury.selector);
        club.withdrawRake(0);
        vm.prank(newTreasury);
        club.withdrawRake(0);
    }

    function test_reentrantClaimerIsPaidOnce() public {
        uint256 id = _round(2);
        ReentrantClaimer attacker = new ReentrantClaimer(club);
        attacker.enter{value: 1 ether}(id, 0);
        _bet(_bettor("b"), id, 1, 1 ether);
        _bet(_bettor("c"), id, 0, 1 ether);
        _lockAndOpen(id, _identity(2), _identity(2));
        _settle(id, _identity(2), _identity(2));

        attacker.claim();
        assertTrue(attacker.reentryAttempted());
        assertFalse(attacker.reentrySucceeded());
        assertEq(address(attacker).balance, 1.425 ether);
        vm.expectRevert(FightClub.AlreadyClaimed.selector);
        attacker.claim();
    }

    function test_reentrantRefunderIsPaidOnce() public {
        uint256 id = _round(2);
        ReentrantClaimer attacker = new ReentrantClaimer(club);
        attacker.enter{value: 1 ether}(id, 0);
        vm.prank(operator);
        club.cancel(id);
        attacker.refund();
        assertTrue(attacker.reentryAttempted());
        assertFalse(attacker.reentrySucceeded());
        assertEq(address(attacker).balance, 1 ether);
    }

    function test_revertingReceiverCannotBlockOthers() public {
        uint256 id = _round(2);
        RejectingReceiver rejecter = new RejectingReceiver();
        rejecter.enter{value: 1 ether}(club, id, 0);
        address a = _bettor("a");
        _bet(a, id, 0, 1 ether);
        _lockAndOpen(id, _identity(2), _identity(2));
        _settle(id, _identity(2), _identity(2));

        vm.expectRevert(FightClub.TransferFailed.selector);
        rejecter.claim(club, id);
        vm.prank(a);
        club.claim(id);
        assertEq(a.balance, 99 ether + 0.95 ether);
    }

    function testFuzz_claimsNeverExceedNetPool(uint256 seed, uint8 nFighters, uint8 nBettors) public {
        uint256 n = bound(nFighters, 2, 8);
        uint256 m = bound(nBettors, 1, 8);
        uint256 id = _round(n);

        address[] memory users = new address[](m);
        for (uint256 i; i < m; ++i) {
            users[i] = _bettor(string(abi.encode("u", i)));
            uint256 r = uint256(keccak256(abi.encode(seed, i)));
            _bet(users[i], id, uint8(r % n), bound(r >> 8, MIN_BET, MAX_BET));
        }

        uint8[] memory labelToIndex = _shuffle(n, uint256(keccak256(abi.encode(seed, "labels"))));
        uint8[] memory judgeRank = _shuffle(n, uint256(keccak256(abi.encode(seed, "judge"))));
        _lockAndOpen(id, labelToIndex, judgeRank);
        for (uint256 i; i < m; ++i) {
            uint256 r = uint256(keccak256(abi.encode(seed, "vote", i)));
            if (r % 3 != 0) _vote(users[i], id, uint8((r >> 8) % n));
        }
        _settle(id, labelToIndex, judgeRank);

        FightClub.Round memory round = club.rounds(id);
        bool refundMode = club.poolByIndex(id, round.winnerIndex) == 0;
        uint256 paid;
        for (uint256 i; i < m; ++i) {
            (uint128 amount, uint8 idx,,) = club.entries(id, users[i]);
            uint256 before = users[i].balance;
            vm.prank(users[i]);
            if (refundMode) {
                club.refund(id);
            } else if (idx == round.winnerIndex) {
                club.claim(id);
            } else {
                continue;
            }
            paid += users[i].balance - before;
            if (refundMode) assertEq(users[i].balance - before, amount);
        }

        if (refundMode) {
            assertEq(round.rake, 0);
            assertEq(paid, round.totalPool);
        } else {
            assertEq(round.rake, uint256(round.totalPool) * 500 / 10_000);
            assertLe(paid, round.totalPool - round.rake);
            assertLe(round.totalPool - round.rake - paid, m);
        }
        assertGe(address(club).balance, club.accruedRake());
    }

    function _shuffle(uint256 n, uint256 seed) internal pure returns (uint8[] memory xs) {
        xs = _identity(n);
        for (uint256 i = n - 1; i > 0; --i) {
            uint256 j = uint256(keccak256(abi.encode(seed, i))) % (i + 1);
            (xs[i], xs[j]) = (xs[j], xs[i]);
        }
    }
}
