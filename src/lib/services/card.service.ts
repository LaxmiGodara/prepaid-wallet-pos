import mongoose from "mongoose";

import { CARD_STATUS, PAGINATION, RECORD_STATUS } from "@/lib/constants";
import { Card, Member } from "@/lib/models";
import type { ICard } from "@/lib/models/card.model";
import { AppError } from "@/types";

export interface CardRecord {
  id: string;
  cardNumber: string;
  memberId: string;
  memberName: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

interface ListCardsInput {
  page: number;
  limit: number;
  search: string | null;
  status: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Matches non-deleted cards, including legacy records missing isDeleted. */
export const NON_DELETED_CARD_FILTER = { isDeleted: { $ne: true } };

export function selectPreferredCardPerMember(
  cards: ICard[],
): Map<string, ICard> {
  const cardMap = new Map<string, ICard>();
  for (const card of cards) {
    const key = card.memberId.toString();
    const existing = cardMap.get(key);
    if (!existing) {
      cardMap.set(key, card);
      continue;
    }
    if (
      card.status === CARD_STATUS.ACTIVE &&
      existing.status !== CARD_STATUS.ACTIVE
    ) {
      cardMap.set(key, card);
    }
  }
  return cardMap;
}

export async function findMemberCard(
  memberId: string | mongoose.Types.ObjectId,
): Promise<ICard | null> {
  const activeCard = await Card.findOne({
    memberId,
    ...NON_DELETED_CARD_FILTER,
    status: CARD_STATUS.ACTIVE,
  }).sort({ createdAt: -1 });

  if (activeCard) return activeCard;

  return Card.findOne({
    memberId,
    ...NON_DELETED_CARD_FILTER,
  }).sort({ createdAt: -1 });
}

export async function findCardsForMembers(
  memberIds: mongoose.Types.ObjectId[],
): Promise<Map<string, ICard>> {
  if (memberIds.length === 0) return new Map();

  const cards = await Card.find({
    memberId: { $in: memberIds },
    ...NON_DELETED_CARD_FILTER,
  }).sort({ createdAt: -1 });

  return selectPreferredCardPerMember(cards);
}

async function generateUniqueCardNumber(): Promise<string> {
  // Generate a 16-digit number formatted as XXXX-XXXX-XXXX-XXXX
  // Retry until unique (collision is extremely rare but handled)
  for (let attempt = 0; attempt < 5; attempt++) {
    const digits = Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 10),
    ).join("");
    const formatted = `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8, 12)}-${digits.slice(12, 16)}`;
    const existing = await Card.findOne({ cardNumber: formatted });
    if (!existing) return formatted;
  }
  throw new AppError(
    "Could not generate a unique card number. Please try again.",
    500,
  );
}

// ── listCards ─────────────────────────────────────────────────────────────────

export async function listCards(
  input: ListCardsInput,
): Promise<{ cardList: CardRecord[]; total: number }> {
  const page = Math.max(1, input.page);
  const limit = Math.min(Math.max(1, input.limit), PAGINATION.MAX_LIMIT);
  const skip = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = { ...NON_DELETED_CARD_FILTER };
  if (input.status) filter.status = input.status;
  if (input.search) {
    const safe = input.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.cardNumber = { $regex: safe, $options: "i" };
  }

  const [cards, total] = await Promise.all([
    Card.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Card.countDocuments(filter),
  ]);

  // Enrich with member names
  const memberIds = cards.map((c) => c.memberId);
  const members = await Member.find({ _id: { $in: memberIds } });
  const memberMap = new Map(members.map((m) => [m._id.toString(), m.fullName]));

  const cardList: CardRecord[] = cards.map((c) => ({
    id: c._id.toString(),
    cardNumber: c.cardNumber,
    memberId: c.memberId.toString(),
    memberName: memberMap.get(c.memberId.toString()) ?? "Unknown",
    status: c.status,
    expiresAt: c.expiresAt.toISOString(),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));

  return { cardList, total };
}

export async function createCard(
  input: { memberId?: string; expiresAt?: string },
  actorId: string,
): Promise<CardRecord> {
  if (!input.memberId?.trim()) {
    throw new AppError("Member is required.", 400, [
      { field: "memberId", message: "Please select a member." },
    ]);
  }
  if (!input.expiresAt) {
    throw new AppError("Expiry date is required.", 400, [
      { field: "expiresAt", message: "Please set an expiry date." },
    ]);
  }

  if (!mongoose.Types.ObjectId.isValid(input.memberId)) {
    throw new AppError("Invalid member ID.", 400);
  }

  const expiresAt = new Date(input.expiresAt);
  if (isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
    throw new AppError("Expiry date must be a valid future date.", 400, [
      { field: "expiresAt", message: "Expiry date must be in the future." },
    ]);
  }

  const member = await Member.findOne({
    _id: input.memberId,
    isDeleted: false,
    status: RECORD_STATUS.ACTIVE,
  });
  if (!member) {
    throw new AppError("Active member not found.", 404);
  }

  const cardNumber = await generateUniqueCardNumber();
  const actorOid = new mongoose.Types.ObjectId(actorId);
  const memberOid = new mongoose.Types.ObjectId(input.memberId);

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // If member already has an active card, replace it
    const existingCard = await Card.findOne({
      memberId: memberOid,
      ...NON_DELETED_CARD_FILTER,
      status: CARD_STATUS.ACTIVE,
    });
    if (existingCard) {
      await Card.findOneAndUpdate(
        { _id: existingCard._id },
        {
          status: CARD_STATUS.REPLACED,
          replacedAt: new Date(),
          updatedBy: actorOid,
        },
        { session },
      );
    }

    const [card] = await Card.create(
      [
        {
          cardNumber,
          memberId: memberOid,
          status: CARD_STATUS.ACTIVE,
          activatedAt: new Date(),
          expiresAt,

          isDeleted: false,
          deletedAt: null,

          createdBy: actorOid,
          updatedBy: null,
        },
      ],
      { session, ordered: true },
    );

    await session.commitTransaction();

    return {
      id: card._id.toString(),
      cardNumber: card.cardNumber,
      memberId: card.memberId.toString(),
      memberName: member.fullName,
      status: card.status,
      expiresAt: card.expiresAt.toISOString(),
      createdAt: card.createdAt.toISOString(),
      updatedAt: card.updatedAt.toISOString(),
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

export async function updateCardStatus(
  cardId: string,
  actorId: string,
): Promise<CardRecord> {
  if (!mongoose.Types.ObjectId.isValid(cardId)) {
    throw new AppError("Invalid card ID.", 400);
  }

  const card = await Card.findById(cardId);
  if (!card) throw new AppError("Card not found.", 404);

  // Only Active and Inactive can be toggled here
  if (
    card.status === CARD_STATUS.REPLACED ||
    card.status === CARD_STATUS.EXPIRED
  ) {
    throw new AppError(
      `A card with status "${card.status}" cannot be toggled. Assign a new card instead.`,
      400,
    );
  }

  const newStatus =
    card.status === CARD_STATUS.ACTIVE
      ? CARD_STATUS.INACTIVE
      : CARD_STATUS.ACTIVE;

  const updated = await Card.findOneAndUpdate(
    { _id: cardId },
    { status: newStatus, updatedBy: new mongoose.Types.ObjectId(actorId) },
    { new: true },
  );
  if (!updated) throw new AppError("Card not found.", 404);

  const member = await Member.findById(updated.memberId);

  return {
    id: updated._id.toString(),
    cardNumber: updated.cardNumber,
    memberId: updated.memberId.toString(),
    memberName: member?.fullName ?? "Unknown",
    status: updated.status,
    expiresAt: updated.expiresAt.toISOString(),
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}
