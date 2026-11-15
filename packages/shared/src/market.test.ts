import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyTrade, matchOdds, openMarket, priceA, quoteBuy, quoteSell, reanchor, roundOdds } from "./market.ts";

// Reference values are the same ones contracts/test/WAB.t.sol checks the Solidity against.
const close = (a: number, b: number, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} != ${b}`);

describe("market math mirrors the contract", () => {
  it("prices a 0.1 MON buy at 50/50", () => {
    const m = openMarket(0.5, 0.5, 200);
    const { shares, fee } = quoteBuy(m, 0, 0.1);
    close(shares, 0.1799038496);
    close(fee, 0.002);
    close(priceA(applyTrade(m, 0, shares)), 0.588994, 1e-6);
  });

  it("round-trips for only the fees", () => {
    const m = openMarket(0.5, 0.5, 200);
    const { shares } = quoteBuy(m, 0, 0.1);
    close(quoteSell(applyTrade(m, 0, shares), 0, shares).proceeds, 0.0961020921);
  });

  it("re-anchors after a round and cashes out at a profit", () => {
    let m = openMarket(0.5, 0.5, 200);
    const { shares } = quoteBuy(m, 0, 0.1);
    m = reanchor(applyTrade(m, 0, shares), 0.5, 1, 0);
    close(priceA(m), 0.75);
    close(quoteSell(m, 0, shares).proceeds, 0.1265790827, 1e-6);
  });

  it("opens from fight history (log5, clamped)", () => {
    const q = roundOdds({ wins: 1, losses: 0 }, { wins: 0, losses: 0 });
    close(q, 2 / 3);
    close(matchOdds(q, 0, 0), 20 / 27);
    close(matchOdds(q, 1, 0), 8 / 9);
    close(matchOdds(q, 1, 1), 2 / 3);
    assert.equal(roundOdds({ wins: 2, losses: 0 }, { wins: 0, losses: 2 }), 0.8);
    close(roundOdds({ wins: 0, losses: 0 }, { wins: 0, losses: 0 }), 0.5);
  });
});
