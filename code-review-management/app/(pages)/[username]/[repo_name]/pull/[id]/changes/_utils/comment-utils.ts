import { Dispatch, SetStateAction } from "react";
import { Side } from "react-diff-view/types/interface";
import {
  DraftReplies,
  DraftReplyItem,
  getDraftReplyKey,
} from "../_hooks/useDraftReplies";
import {
  DraftThreadItem,
  DraftThreads,
  getDraftThreadKeyFromItem,
} from "../_hooks/useDraftThreads";
import {
  PublishedThreadItem,
  PublishedThreads,
  PublishedThreadsByLine,
} from "../_hooks/usePublishedThreads";

/**
 * Deletes the given draft thread from the state.
 *
 * @param draft: `DraftThreadItem` representing the draft to delete.
 * @param setDraftThreads: Draft thread state setter.
 */
export function deleteDraftThread(
  draft: DraftThreadItem,
  setDraftThreads: Dispatch<SetStateAction<DraftThreads>>,
) {
  setDraftThreads((prev) => {
    const key = getDraftThreadKeyFromItem(draft);
    const draftThreads = { ...prev };
    const activePathThreads = { ...prev[draft.activePath] };
    delete activePathThreads[key];
    draftThreads[draft.activePath] = activePathThreads;
    return draftThreads;
  });
}

/**
 * Deletes the given draft reply from the state.
 *
 * @param reply: `DraftReplyItem` representing the reply to delete.
 * @param setDraftReplies: Draft reply state setter.
 */
export function deleteDraftReply(
  reply: DraftReplyItem,
  setDraftReplies: Dispatch<SetStateAction<DraftReplies>>,
) {
  setDraftReplies((prev) => {
    const key = getDraftReplyKey(reply.filename, reply.parentId);
    const draftReplies = { ...prev };
    delete draftReplies[key];
    return draftReplies;
  });
}

export function createDraftThread(
  setDraftThreads: Dispatch<SetStateAction<DraftThreads>>,
  activePath: string,
  draft: DraftThreadItem,
) {
  setDraftThreads((prev) => {
    const key = getDraftThreadKeyFromItem(draft);
    if (activePath in prev && key in prev[activePath]) return prev;

    return {
      ...prev,
      [activePath]: {
        ...prev[activePath],
        [key]: draft,
      },
    };
  });
}

/**
 * Gets the correct path to pass to the GitHub API when publishing a draft
 * thread. If the file has a "renamed" status, the LHS of the diff is associated
 * with the old path whereas the RHS of the diff is associated with the new path.
 *
 * @param oldPath: Old path of the file.
 * @param activePath: Active path of the file.
 * @param fileStatus: Status of the file calculated by GitHub (e.g., removed, renamed).
 * @param side: Side of the diff that the comment is made on.
 * @returns: The correct path to associate with the draft thread.
 */
export function getDraftThreadFilePath(
  oldPath: string,
  activePath: string,
  fileStatus: string,
  side?: Side,
) {
  return fileStatus === "renamed" && side === "old" ? oldPath : activePath;
}

/**
 * Gets published threads for a file. Most of this logic is for handling renamed
 * files since GitHub associates the LHS of a renamed file with the old
 * path, and the RHS with the new path. We handle this case by getting the
 * published threads for both the old path and the new path and combining it
 * into one map.
 *
 * @param publishedThreads: Published threads for the entire pull request.
 * @param oldPath: Old path of the file.
 * @param activePath: Active path of the file.
 * @param fileStatus: Status of the file calculated by GitHub (e.g., removed, renamed).
 * @returns: `PublishedThreadsByLine` object containing all relevant published
 *            threads for the file.
 */
export function getPublishedThreadsByLine(
  publishedThreads: PublishedThreads,
  oldPath: string,
  activePath: string,
  fileStatus: string,
) {
  const activePathThreads: PublishedThreadsByLine =
    publishedThreads.get(activePath)?.lineThreads ?? new Map();
  const oldPathThreads: PublishedThreadsByLine =
    publishedThreads.get(oldPath)?.lineThreads ?? new Map();
  const merged: PublishedThreadsByLine = new Map();

  if (fileStatus !== "renamed") return activePathThreads;

  // Copy over entries of `activePathThreads` to `merged`.
  for (const [line, thread] of activePathThreads) {
    merged.set(line, { left: [...thread.left], right: [...thread.right] });
  }

  // Copy over entries of `oldPathThreads` to `merged`.
  for (const [line, thread] of oldPathThreads) {
    const existing = merged.get(line);
    if (existing) {
      // Do not override entries with the same key from `activePathThreads`.
      // Since these comments are associated with the same line number, push it
      // into the array. Threads are re-ordered by creation time below.
      existing.left.push(...thread.left);
      existing.right.push(...thread.right);
    } else {
      merged.set(line, { left: [...thread.left], right: [...thread.right] });
    }
  }

  const byCreatedDate = (a: PublishedThreadItem, b: PublishedThreadItem) =>
    new Date(a.comments[0].created_at).getTime() -
    new Date(b.comments[0].created_at).getTime();

  for (const threads of merged.values()) {
    threads.left.sort(byCreatedDate);
    threads.right.sort(byCreatedDate);
  }

  return merged;
}

/**
 * Gets the basename of a file path. Used for displaying the file basename in
 * the comment headers on the activity panel.
 *
 * @param path: File path.
 */
export function getBasename(path: string) {
  return path.split("/").at(-1) ?? path;
}
