import { useAutoFetchAllPages } from "@/lib/api/hooks/useAutoFetchAllPages";
import { useReviewCommentsQuery } from "@/lib/api/queries/useReviewCommentsQuery";
import { Comment } from "@/types/github.types";

/*
 * Since the GitHub API returns all pull request comments as a flat array, we
 * need to build the structure of the comment relationships. This includes
 * the following:
 *   - Identifying which comments are part of the same thread
 *   - Identifying the parent comment in a thread
 *   - Ordering the comments within a thread by time created
 *   - Mapping a thread to the file, line number, and side of the diff that it
 *     belongs to
 *
 * For now, we do this pre-processing here and assume that the data we retrieve
 * is sorted by time created (which is supported by the GitHub API).
 *
 * We build a hash-map from filename -> line-number -> side -> array of threads
 */

type FileName = string;
type LineNumber = number;

export type PublishedThreadsByScope = {
  lineThreads: PublishedThreadsByLine;
  fileThreads: PublishedThreadItem[];
  outdatedThreads: PublishedThreadItem[];
};

export type PublishedThreads = Map<FileName, PublishedThreadsByScope>;
export type PublishedThreadsByLine = Map<LineNumber, PublishedThreadsBySide>;

/**
 * When building the array of 'PublishedThreadItem', the threads are ordered by
 * their creation time (again, assuming the data we retrieve from GitHub is
 * sorted this way).
 */
export interface PublishedThreadsBySide {
  left: PublishedThreadItem[];
  right: PublishedThreadItem[];
}

export interface PublishedThreadItem {
  id: number;
  path: string;
  original_start_line: number | null;
  original_line: number | null;
  start_line: number | null;
  line: number | null;
  start_side: "LEFT" | "RIGHT" | null;
  side: "LEFT" | "RIGHT";
  subject_type: "line" | "file";
  comments: Comment[];
}

export function usePublishedThreads(
  owner: string,
  repo: string,
  pullNumber: string,
) {
  const {
    data: publishedThreads,
    hasNextPage,
    fetchNextPage,
    isFetching,
    isPending,
    isError,
    error,
  } = useReviewCommentsQuery(owner, repo, pullNumber, buildCommentRelations);
  useAutoFetchAllPages(hasNextPage, isFetching, fetchNextPage);

  return {
    publishedThreads,
    isPending,
    isError,
    error,
  };
}

function buildCommentRelations(comments: Comment[]) {
  const threadsByFile = groupThreadsByFile(comments);
  const publishedThreads: PublishedThreads = new Map();

  for (const [filename, threads] of threadsByFile) {
    publishedThreads.set(filename, {
      lineThreads: groupThreadsByLineAndSide(threads),
      fileThreads: threads.filter((thread) => thread.subject_type === "file"),
      outdatedThreads: threads.filter((thread) => thread.line === null),
    });
  }

  return publishedThreads;
}

/**
 * This function takes a flat array of comments from the GitHub API and returns
 * Map<FileName, PublishedThreadItem[]>: a mapping from the filename to an array
 * of comment threads belonging to that file. This array of threads is ordered
 * by their creation time, assuming that the GitHub API returns the data in this
 * sorted order.
 */
function groupThreadsByFile(comments: Comment[]) {
  const threadsByFile: Map<FileName, PublishedThreadItem[]> = new Map();

  for (const comment of comments) {
    if (!threadsByFile.has(comment.path)) {
      threadsByFile.set(comment.path, []);
    }

    /**
     * If the comment's 'inReplyTo' field is populated, then it is a REPLY for a
     * thread. We push this comment in the existing array for that corresponding
     * thread. This array is guaranteed to exist because the comments are sorted
     * by their creation time, so the parent should already be in this map.
     *
     * Note: An array is used but it is O(n) time to find the correct thread.
     * This can potentially be refactored to use a Map, but I'll keep it as an
     * array since three nested maps might be less readable for now.
     */
    if (comment.in_reply_to_id) {
      // Use the non-null assertion since it's guaranteed that 'path' is a key
      // in 'threadsByFile' since we set it above if it does not already exist.
      const parent = threadsByFile
        .get(comment.path)!
        .find((thread) => thread.id === comment.in_reply_to_id);
      parent?.comments.push(comment);
    } else {
      /**
       * If the comment's 'inReplyTo' field is NOT populated, then it is the
       * PARENT for a thread. We push this comment as a NEW thread belonging to
       * its corresponding file.
       */
      threadsByFile.get(comment.path)!.push({
        id: comment.id,
        path: comment.path,
        start_side: comment.start_side,
        side: comment.side,
        original_start_line: comment.original_start_line,
        original_line: comment.original_line,
        start_line: comment.start_line,
        line: comment.line,
        subject_type: comment.subject_type,
        comments: [comment],
      });
    }
  }

  return threadsByFile;
}

function groupThreadsByLineAndSide(threads: PublishedThreadItem[]) {
  const threadsByLine: PublishedThreadsByLine = new Map();

  for (const thread of threads) {
    const { line, side, subject_type } = thread;

    if (!line || !side || subject_type !== "line") continue;

    if (!threadsByLine.has(line)) {
      threadsByLine.set(line, { left: [], right: [] });
    }

    const diffSide = side === "LEFT" ? "left" : "right";
    // Use non-null assertion since it's guaranteed that 'line' is a key in
    // 'threadsByLine' since we set it above if it does not already exist.
    threadsByLine.get(line)![diffSide].push(thread);
  }

  return threadsByLine;
}
