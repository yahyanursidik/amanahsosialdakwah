import type { CrmContactsDocument } from "@/generated/neon/models";

export type ContactDuplicateCandidate = {
  contact: CrmContactsDocument;
  reasons: string[];
  score: number;
};

export type ContactDraftForDuplicateCheck = Pick<
  CrmContactsDocument,
  | "city"
  | "display_name"
  | "normalized_email"
  | "normalized_name"
  | "normalized_phone"
  | "primary_email"
  | "primary_phone"
>;

export function normalizeContactText(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");
}

export function normalizePhone(value: string | undefined): string {
  const digits = (value ?? "").replace(/\D/g, "");

  if (digits.startsWith("62")) {
    return `0${digits.slice(2)}`;
  }

  return digits;
}

function tokenOverlap(left: string, right: string): number {
  const leftTokens = new Set(left.split(" ").filter((item) => item.length > 2));
  const rightTokens = new Set(
    right.split(" ").filter((item) => item.length > 2),
  );

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  const overlap = [...leftTokens].filter((token) =>
    rightTokens.has(token),
  ).length;
  return overlap / Math.max(leftTokens.size, rightTokens.size);
}

function emailOf(contact: ContactDraftForDuplicateCheck): string {
  return normalizeContactText(
    contact.normalized_email || contact.primary_email,
  );
}

function phoneOf(contact: ContactDraftForDuplicateCheck): string {
  return normalizePhone(contact.normalized_phone || contact.primary_phone);
}

function nameOf(contact: ContactDraftForDuplicateCheck): string {
  return normalizeContactText(contact.normalized_name || contact.display_name);
}

export function findDuplicateCandidates(
  draft: ContactDraftForDuplicateCheck,
  contacts: CrmContactsDocument[],
): ContactDuplicateCandidate[] {
  const draftEmail = emailOf(draft);
  const draftPhone = phoneOf(draft);
  const draftName = nameOf(draft);
  const draftCity = normalizeContactText(draft.city);

  return contacts
    .map((contact) => {
      const reasons: string[] = [];
      let score = 0;

      if (draftEmail && draftEmail === emailOf(contact)) {
        score = Math.max(score, 0.95);
        reasons.push("Email sama");
      }

      if (draftPhone && draftPhone === phoneOf(contact)) {
        score = Math.max(score, 0.9);
        reasons.push("Nomor telepon sama");
      }

      const nameScore = tokenOverlap(draftName, nameOf(contact));
      if (nameScore >= 0.75) {
        const sameCity =
          draftCity && draftCity === normalizeContactText(contact.city);
        score = Math.max(score, sameCity ? 0.78 : 0.64);
        reasons.push(sameCity ? "Nama dan kota mirip" : "Nama mirip");
      }

      return {
        contact,
        reasons,
        score,
      };
    })
    .filter((candidate) => candidate.score >= 0.64)
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);
}

export function canAutoMergeContacts(): false {
  return false;
}
