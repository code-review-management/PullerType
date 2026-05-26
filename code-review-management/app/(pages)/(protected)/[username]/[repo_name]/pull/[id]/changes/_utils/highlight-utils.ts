import { Dispatch, RefObject, SetStateAction } from "react";
import { ChangeData } from "react-diff-view";
import { Side } from "react-diff-view/types/interface";
import { DraftThreads } from "../_hooks/useDraftThreads";
import { ActiveHighlight } from "../_hooks/useHighlight";
import { createDraftThread } from "./comment-utils";
import { getLineNumber } from "./diff-utils";

/**
 * Given two line numbers, identities the minimum and maximum. Useful for
 * comparing the start and end lines of a highlight range. The start line is the
 * minimum when dragged downwards, yet the maximum when dragged upwards.
 *
 * @param line1: Number of the first line to compare.
 * @param line2: Number of the second line to compare.
 * @returns: Array containing the minimum line followed by the maximum line.
 */
function getMinMaxLines(line1: number, line2: number) {
  const minLine = Math.min(line1, line2);
  const maxLine = Math.max(line1, line2);
  return [minLine, maxLine];
}

/**
 * Checks if a line is currently highlighted.
 *
 * @param line: Line number.
 * @param side: Side of the diff that the line is on ("old" or "new").
 * @param activeHighlight: State of the active highlight in the file diff.
 * @returns: True if this line is within the active highlight range; false otherwise.
 */
export function isWithinHighlightRange(
  line: number,
  side: Side,
  activeHighlight: ActiveHighlight,
) {
  if (!activeHighlight.start || !activeHighlight.end || !activeHighlight.side)
    return false;

  const [minLine, maxLine] = getMinMaxLines(
    activeHighlight.start,
    activeHighlight.end,
  );

  return activeHighlight.side === side && line >= minLine && line <= maxLine;
}

/**
 * Gutter event handler that fires when the user clicks on a gutter. Starts a
 * new highlight session. Updates the `activeHighlight` state and ref.
 *
 * @param change: `Change` object containing data about the line associated with the clicked gutter.
 * @param side: Side of the clicked gutter ("old" or "new").
 * @param setActiveHighlightSync: State setter for `activeHighlight` and its corresponding ref.
 */
export function highlightOnMouseDown(
  change: ChangeData,
  side: Side,
  setActiveHighlightSync: (data: ActiveHighlight) => void,
) {
  const line = getLineNumber(change, side);
  setActiveHighlightSync({
    isHighlighting: true,
    start: line,
    end: line,
    side: side,
  });
}

/**
 * Gutter event handler that fires when the user's mouse enters a gutter. Does
 * not do anything if the user is not currently highlighting, or if their mouse
 * has entered a gutter on the opposite side of the diff from where the
 * highlight started. Otherwise, updates the `activeHighlight` state and ref
 * with the last line of the gutter that they have entered.
 *
 * @param change: `Change` object containing data about the line associated with the gutter that was entered.
 * @param side: Side of the gutter that was entered ("old" or "new").
 * @param activeHighlightRef: Ref of the `activeHighlight` state in the file diff.
 * @param setActiveHighlightSync: State setter for `activeHighlight` and its corresponding ref.
 */
export function highlightOnMouseEnter(
  change: ChangeData,
  side: Side,
  activeHighlightRef: RefObject<ActiveHighlight>,
  setActiveHighlightSync: (data: ActiveHighlight) => void,
) {
  const activeHighlight = activeHighlightRef.current;
  if (!activeHighlight.isHighlighting || side !== activeHighlight.side) return;

  const line = getLineNumber(change, side);
  setActiveHighlightSync({
    ...activeHighlight,
    end: line,
  });
}

/**
 * Document event handler that fires when the user's mouse is released while
 * highlighting. Updates the `activeHighlight` state and ref to indicate that
 * the user has stopped highlighting. Generates a new draft thread associated
 * with the highlighted lines.
 *
 * @param oldPath: Old path of the file associated with this highlight state.
 * @param activePath: Active path of the file associated with this highlight state.
 * @param fileStatus: Status of the file calculated by GitHub (e.g., removed, renamed).
 * @param activeHighlightRef: Ref of the `activeHighlight` state in the file diff.
 * @param setActiveHighlightSync: State setter for `activeHighlight` and its corresponding ref.
 * @param setDraftThreads: State setter for `draftThreads`.
 */
export function highlightOnMouseUp(
  oldPath: string,
  activePath: string,
  fileStatus: string,
  activeHighlightRef: RefObject<ActiveHighlight>,
  setActiveHighlightSync: (data: ActiveHighlight) => void,
  setDraftThreads: Dispatch<SetStateAction<DraftThreads>>,
) {
  const activeHighlight = activeHighlightRef.current;
  setActiveHighlightSync({
    ...activeHighlight,
    isHighlighting: false,
  });

  if (!activeHighlight.start || !activeHighlight.end || !activeHighlight.side)
    return;

  const [minLine, maxLine] = getMinMaxLines(
    activeHighlight.start,
    activeHighlight.end,
  );

  /**
   * If there is already a draft associated with the max highlighted line on the
   * same side of the diff, do NOT generate a new draft thread since a line can
   * only be associated with 1 draft thread at a time (same behavior as GitHub),
   * and we do not want to override the already existing draft.
   */
  createDraftThread(setDraftThreads, activePath, {
    oldPath,
    activePath,
    fileStatus,
    body: "",
    subjectType: "line",
    start: minLine,
    end: maxLine,
    side: activeHighlight.side!,
  });
}

/**
 * Clear the highlight if it exists at the given start line, end line, and side
 * of the diff.
 *
 * @param start: Start line of highlight.
 * @param end: End line of highlight.
 * @param side: Diff side of highlight.
 * @param activeHighlightRef: Ref of the `activeHighlight` state in the file diff.
 * @param setActiveHighlightSync: State setter for `activeHighlight` and its corresponding ref.
 */
export function clearHighlightIfMatch(
  start: number | null,
  end: number | null,
  side: Side | null,
  activeHighlightRef: RefObject<ActiveHighlight>,
  setActiveHighlightSync: (data: ActiveHighlight) => void,
) {
  const activeHighlight = activeHighlightRef.current;
  if (!activeHighlight.start || !activeHighlight.end) return;
  const [minHighlightLine, maxHighlightLine] = getMinMaxLines(
    activeHighlight.start,
    activeHighlight.end,
  );

  if (
    minHighlightLine === start &&
    maxHighlightLine === end &&
    activeHighlight.side === side
  ) {
    setActiveHighlightSync({
      isHighlighting: false,
      start: null,
      end: null,
      side: null,
    });
  }
}
