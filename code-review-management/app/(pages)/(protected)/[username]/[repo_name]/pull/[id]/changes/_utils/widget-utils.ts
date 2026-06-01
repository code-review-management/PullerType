import { ReactNode } from "react";
import { ChangeData, getChangeKey, HunkData } from "react-diff-view";
import {
  DraftThreadsByLine,
  getDraftThreadKey,
} from "../_hooks/useDraftThreads";
import { PublishedThreadsByLine } from "../_hooks/usePublishedThreads";
import InlineThreadList from "../_components/InlineThreadList/InlineThreadList";

/**
 * For a given line in the file diff, group its published and draft threads by
 * side (left or right).
 *
 * @param change: `Change` object containing data about this line in the file diff.
 * @param publishedThreads: Published threads for this file, keyed by line number.
 * @param draftThreads: Draft threads for this file, keyed by draft thread key.
 * @returns: An object with `published` and `draft` sub-objects that groups
 *           threads by left and right sides.
 */
function getThreadsBySide(
  change: ChangeData,
  publishedThreads: PublishedThreadsByLine,
  draftThreads: DraftThreadsByLine,
) {
  if (change.type === "normal") {
    return {
      published: {
        left: publishedThreads.get(change.oldLineNumber)?.left ?? [],
        right: publishedThreads.get(change.newLineNumber)?.right ?? [],
      },
      draft: {
        left: draftThreads[getDraftThreadKey(change.oldLineNumber, "old")],
        right: draftThreads[getDraftThreadKey(change.newLineNumber, "new")],
      },
    };
  }

  if (change.type === "delete") {
    return {
      published: {
        left: publishedThreads.get(change.lineNumber)?.left ?? [],
        right: [],
      },
      draft: {
        left: draftThreads[getDraftThreadKey(change.lineNumber, "old")],
        right: null,
      },
    };
  }

  if (change.type === "insert") {
    return {
      published: {
        left: [],
        right: publishedThreads.get(change.lineNumber)?.right ?? [],
      },
      draft: {
        left: null,
        right: draftThreads[getDraftThreadKey(change.lineNumber, "new")],
      },
    };
  }

  return {
    published: { left: [], right: [] },
    draft: { left: null, right: null },
  };
}

/**
 * Builds a map of widgets to render within `react-diff-view`.
 *
 * @param filename: File being diffed.
 * @param hunks: Hunks that make up this file's diff.
 * @param publishedThreads: Published threads for this file, keyed by line number.
 * @param draftThreads: Draft threads for this file, keyed by draft thread key.
 * @returns: A record that maps change-keys to their corresponding thread list widgets.
 */
export function getWidgets(
  hunks: HunkData[],
  publishedThreads: PublishedThreadsByLine,
  draftThreads: DraftThreadsByLine,
) {
  const changes = hunks.flatMap((hunk) => hunk.changes);
  const widgets: Record<string, ReactNode> = {};

  changes.forEach((change) => {
    const { published: publishedThreadsBySide, draft: draftThreadsBySide } =
      getThreadsBySide(change, publishedThreads, draftThreads);

    const hasContent =
      publishedThreadsBySide.left.length > 0 ||
      publishedThreadsBySide.right.length > 0 ||
      draftThreadsBySide.left ||
      draftThreadsBySide.right;

    if (hasContent) {
      widgets[getChangeKey(change)] = InlineThreadList({
        change,
        publishedThreadsBySide,
        draftThreadsBySide
      });
    }
  });

  return widgets;
}
