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
import { FileDiff } from "@/types/github.types";
import { ThreadStatus } from "../_components/InlinePublishedThread/InlinePublishedThread";

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

/**
 * Sorts a list of published threads. Used by the activity panel.
 *
 * @param threads: Array of published threads.
 * @param flatFileTree: Flattened file tree that helps define the ordering.
 * @param threadIndexMap: Map from thread objects to the index of their
 *                        corresponding file-diff in `flatFileTree`.
 * @param threadStatusMap: Map from thread objects to their statuses.
 */
export function sortPublishedThreads(
  threads: PublishedThreadItem[],
  flatFileTree: FileDiff[],
  threadIndexMap: Map<PublishedThreadItem, number>,
  threadStatusMap: Map<PublishedThreadItem, ThreadStatus>,
) {
  threads.sort((a, b) => {
    // Move outdated/detached comments to the bottom.
    const isStaleA = threadStatusMap.get(a) !== "current";
    const isStaleB = threadStatusMap.get(b) !== "current";
    if (!isStaleA && isStaleB) return -1;
    if (isStaleA && !isStaleB) return 1;

    // Match a thread to its corresponding file in the flat file tree.
    const indexA = threadIndexMap.get(a) ?? -1;
    const indexB = threadIndexMap.get(b) ?? -1;

    if (indexA === -1 || indexB === -1) {
      // Put matched files before unmatched files.
      if (indexA !== indexB) return indexA !== -1 ? -1 : 1;

      // For unmatched files, sort them alphabetically.
      const pathCompared = a.path.localeCompare(b.path);
      if (pathCompared !== 0) return pathCompared;
    } else {
      // Sort matched files by their position in the flat file tree.
      if (indexA !== indexB) return indexA - indexB;

      // Executes when indexA === indexB -> refers to same node.
      const nodeA = flatFileTree.at(indexA);
      // For renamed files, comments can be associated with either the old
      // filename or new filename, depending on the side they were made on.
      // Sort comments associated with the old filename right before comments
      // with the new filename.
      if (nodeA?.status === "renamed") {
        const isPreviousPathA = a.path === nodeA.previous_filename;
        const isPreviousPathB = b.path === nodeA.previous_filename;
        if (isPreviousPathA !== isPreviousPathB)
          return isPreviousPathA ? -1 : 1;
      }
    }

    // For a group of threads associated with the same filename, put file-level
    // comments first.
    const isFileA = a.subject_type === "file";
    const isFileB = b.subject_type === "file";
    if (isFileA !== isFileB) return isFileA ? -1 : 1;

    // For line-level comments, sort by line number, then side.
    if (!isFileA && !isFileB && a.line && b.line) {
      if (a.line !== b.line) return a.line - b.line;
      if (a.side !== b.side) return a.side === "LEFT" ? -1 : 1;
    }

    // Fallback: sort by creation time.
    return (
      new Date(a.comments[0].created_at).getTime() -
      new Date(b.comments[0].created_at).getTime()
    );
  });
}

/**
 * Get the index of the file in that flat file tree that a published thread
 * is associated with.
 *
 * @param thread: Published thread item.
 * @param flatFileTree: Flattened file tree array.
 * @returns: Index of the matched file; -1 if unmatched.
 */
function findThreadInFlatFileTree(
  thread: PublishedThreadItem,
  flatFileTree: FileDiff[],
) {
  return flatFileTree.findIndex((node) => {
    const matchActivePath = node.filename === thread.path;
    const matchPreviousPath =
      node.status === "renamed" && node.previous_filename === thread.path;
    return matchActivePath || matchPreviousPath;
  });
}

/**
 * Builds out a map from thread objects to the index of their corresponding
 * file-diff in `flatFileTree`.
 *
 * @param threads: List of published thread items.
 * @param flatFileTree: Flattened file tree array.
 * @returns: A map from thread objects to their file-diff indices.
 */
export function buildThreadIndexMap(
  threads: PublishedThreadItem[],
  flatFileTree: FileDiff[],
) {
  const threadIndexMap = new Map<PublishedThreadItem, number>();
  threads.forEach((thread) => {
    threadIndexMap.set(thread, findThreadInFlatFileTree(thread, flatFileTree));
  });
  return threadIndexMap;
}

/**
 * Builds out a map from thread objects to their statuses.
 *
 * @param threads: List of published thread items.
 * @param threadIndexMap: Map from thread objects to the index of their
 *                        corresponding file-diff in `flatFileTree`.
 * @returns: A map from thread objects to their statuses.
 */
export function buildThreadStatusMap(
  threads: PublishedThreadItem[],
  threadIndexMap: Map<PublishedThreadItem, number>,
): Map<PublishedThreadItem, ThreadStatus> {
  const threadStatusMap = new Map<PublishedThreadItem, ThreadStatus>();

  threads.forEach((thread) => {
    const index = threadIndexMap.get(thread) ?? -1;
    if (index === -1) {
      threadStatusMap.set(thread, "file-detached");
    } else if (thread.line === null) {
      threadStatusMap.set(thread, "line-outdated");
    } else {
      threadStatusMap.set(thread, "current");
    }
  });

  return threadStatusMap;
}
