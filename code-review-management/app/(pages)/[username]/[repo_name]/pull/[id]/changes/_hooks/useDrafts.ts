import { useState } from "react";

/**
 * Drafts are comments that the user is in-progress of creating. They are not
 * yet published to GitHub. Using the highlight functionality generates a draft
 * for a NEW thread.
 *
 * Supports only "line" subject types, not files.
 *
 * TODO: Handle reply drafts when responding to an already published thread.
 * Create a new hook for handling replies.
 */

type FileName = string;
type LineNumber = number;

export type Drafts = Map<FileName, DraftsByLine>;
export type DraftsByLine = Map<LineNumber, DraftsBySide>;

export interface DraftsBySide {
  left?: DraftItem;
  right?: DraftItem;
}

export interface DraftItem {
  path: string;
  body: string;
  startLine: number;
  endLine: number;
  side: "left" | "right";
  createdAt: string;
}

export function useDrafts() {
  const [drafts, setDrafts] = useState<Drafts>(new Map());
  return { drafts, setDrafts };
}
