import { describe, expect, it } from "vitest";

import { computeReadiness } from "@/lib/services/billing.service";
import { CARD_STATUS, RECORD_STATUS } from "@/lib/constants";
import type { ICard, IMember, IWallet } from "@/lib/models";

// computeReadiness is the gate that decides whether a bill can even be
// attempted: all six checks must pass. This is exactly the kind of logic
// the engineering review flagged as untested and highest-risk to regress
// silently — a single flipped `!==` here would let bills through for an
// inactive member/wallet/card, or block every legitimate bill outright.
//
// These are plain-object fakes cast to the Mongoose document interfaces
// rather than real Documents — computeReadiness only reads plain fields off
// them, so this is a faithful, fast, no-database way to exercise every
// branch.

function fakeMember(overrides: Partial<IMember> = {}): IMember {
  return { status: RECORD_STATUS.ACTIVE, ...overrides } as IMember;
}

function fakeWallet(overrides: Partial<IWallet> = {}): IWallet {
  return { status: RECORD_STATUS.ACTIVE, ...overrides } as IWallet;
}

function fakeCard(overrides: Partial<ICard> = {}): ICard {
  return {
    status: CARD_STATUS.ACTIVE,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365), // 1 year out
    ...overrides,
  } as ICard;
}

describe("computeReadiness", () => {
  it("is ready when every condition passes", () => {
    const result = computeReadiness(fakeMember(), fakeWallet(), fakeCard());

    expect(result.isReady).toBe(true);
    expect(result.checks).toEqual({
      memberActive: true,
      walletExists: true,
      walletActive: true,
      cardAssigned: true,
      cardActive: true,
      cardNotExpired: true,
    });
  });

  it("is not ready when the member is inactive", () => {
    const result = computeReadiness(
      fakeMember({ status: RECORD_STATUS.INACTIVE }),
      fakeWallet(),
      fakeCard(),
    );

    expect(result.isReady).toBe(false);
    expect(result.checks.memberActive).toBe(false);
  });

  it("is not ready when there is no wallet", () => {
    const result = computeReadiness(fakeMember(), null, fakeCard());

    expect(result.isReady).toBe(false);
    expect(result.checks.walletExists).toBe(false);
    expect(result.checks.walletActive).toBe(false);
  });

  it("is not ready when the wallet is inactive", () => {
    const result = computeReadiness(
      fakeMember(),
      fakeWallet({ status: RECORD_STATUS.INACTIVE }),
      fakeCard(),
    );

    expect(result.isReady).toBe(false);
    expect(result.checks.walletExists).toBe(true);
    expect(result.checks.walletActive).toBe(false);
  });

  it("is not ready when there is no card assigned", () => {
    const result = computeReadiness(fakeMember(), fakeWallet(), null);

    expect(result.isReady).toBe(false);
    expect(result.checks.cardAssigned).toBe(false);
    expect(result.checks.cardActive).toBe(false);
    expect(result.checks.cardNotExpired).toBe(false);
  });

  it("is not ready when the card is inactive", () => {
    const result = computeReadiness(
      fakeMember(),
      fakeWallet(),
      fakeCard({ status: CARD_STATUS.INACTIVE }),
    );

    expect(result.isReady).toBe(false);
    expect(result.checks.cardActive).toBe(false);
  });

  it("is not ready when the card has expired", () => {
    const result = computeReadiness(
      fakeMember(),
      fakeWallet(),
      fakeCard({ expiresAt: new Date(Date.now() - 1000) }), // 1 second ago
    );

    expect(result.isReady).toBe(false);
    expect(result.checks.cardNotExpired).toBe(false);
  });

  it("is not ready when multiple conditions fail at once", () => {
    const result = computeReadiness(
      fakeMember({ status: RECORD_STATUS.INACTIVE }),
      null,
      null,
    );

    expect(result.isReady).toBe(false);
    expect(result.checks).toEqual({
      memberActive: false,
      walletExists: false,
      walletActive: false,
      cardAssigned: false,
      cardActive: false,
      cardNotExpired: false,
    });
  });
});
