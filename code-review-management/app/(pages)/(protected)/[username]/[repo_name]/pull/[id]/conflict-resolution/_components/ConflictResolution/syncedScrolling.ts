import type * as MonacoEditor from "monaco-editor";
import { ParsedConflict } from "./parseMerge";
import { FileWorkspaceState } from "./ConflictResolution";

export interface SyncAnchor {
  currentLine: number;
  incomingLine: number;
  resultLine: number;
}

/**
 * Generates anchors which are used to interpolate for synced scrolling
 * @param conflicts the parsed conflicts, to be used as a fallback and for current/incoming editor
 * @param resultModel the result model, used because content is written into
 * @param resultDecorations the result decorations, for the blocks
 * @param currentMaxLine the total line count for current
 * @param incomingMaxLine the total line count for incoming
 * @param resultMaxLine the total line count for result
 * @returns A list of anchors, which are used as signifiers when sync scrolling (basically a sign saying "block border here")
 */
export const generateAnchors = (
  conflicts: ParsedConflict[],
  resultModel: MonacoEditor.editor.ITextModel,
  resultDecorations: Record<string, string[]>,
  currentMaxLine: number,
  incomingMaxLine: number,
  resultMaxLine: number,
): SyncAnchor[] => {
  const anchors: SyncAnchor[] = [];

  anchors.push({ currentLine: 1, incomingLine: 1, resultLine: 1 });

  conflicts.forEach((c) => {
    const decorationIds = resultDecorations[c.id];
    const resultRange = decorationIds
      ? resultModel.getDecorationRange(decorationIds[0])
      : null;

    const resStart = resultRange
      ? resultRange.startLineNumber
      : c.resultInsertLine;
    const resEnd = resultRange ? resultRange.endLineNumber : c.resultInsertLine;

    const curLineCount = c.currentText ? c.currentText.split("\n").length : 1;
    const incLineCount = c.incomingText ? c.incomingText.split("\n").length : 1;

    const curStart = c.currentStartLine;
    const incStart = c.incomingStartLine;

    const curEnd = curStart + curLineCount - 1;
    const incEnd = incStart + incLineCount - 1;

    anchors.push({
      currentLine: curStart,
      incomingLine: incStart,
      resultLine: resStart,
    });
    anchors.push({
      currentLine: curEnd,
      incomingLine: incEnd,
      resultLine: resEnd,
    });
  });

  anchors.push({
    currentLine: currentMaxLine,
    incomingLine: incomingMaxLine,
    resultLine: resultMaxLine,
  });

  return anchors;
};

/**
 * This calls generate anchors, but instead uses the cache and extracts the data from that
 * @param cache editor cache, it has a ton of data about each editor state
 * @returns returns sync anchors used for scroll interpolation
 */
export const refreshAnchors = (cache: FileWorkspaceState) => {
  if (!cache) return;

  const currentMax = cache.currentModel.getLineCount();
  const incomingMax = cache.incomingModel.getLineCount();
  const resultMax = cache.resultModel.getLineCount();

  cache.syncAnchors = generateAnchors(
    cache.conflicts,
    cache.resultModel,
    cache.resultDecorations,
    currentMax,
    incomingMax,
    resultMax,
  );
};

/**
 * A function when the scroll changes to look at the current zone and the anchors surrounding it.
 * It then moves to equalize the anchor to anchor positioning
 * @param sourceEditor editor that got scrolled on
 * @param targetEditor1 one editor (doesn't matter which)
 * @param targetEditor2 other editor
 * @param getAnchors A function to get the anchors, it is done as a function to get the most up to date one
 * @param sourceKey Key to be used to signify if this is current/incoming/result
 * @param target1Key Key to be used to signify if this is current/incoming/result
 * @param target2Key Key to be used to signify if this is current/incoming/result
 * @param syncState Buffer value used to make it not an infinite loop of one update triggering another
 * @returns The actual function to be called when scroll changes
 */
export const bindInterpolatedScroll = (
  sourceEditor: MonacoEditor.editor.IStandaloneCodeEditor,
  targetEditor1: MonacoEditor.editor.IStandaloneCodeEditor,
  targetEditor2: MonacoEditor.editor.IStandaloneCodeEditor,
  getAnchors: () => SyncAnchor[],
  sourceKey: keyof SyncAnchor,
  target1Key: keyof SyncAnchor,
  target2Key: keyof SyncAnchor,
  syncState: { isSyncing: boolean },
) => {
  return sourceEditor.onDidScrollChange((e: MonacoEditor.IScrollEvent) => {
    if (syncState.isSyncing || !e.scrollTopChanged) return;
    syncState.isSyncing = true;

    const sourceY = e.scrollTop;
    const anchors = getAnchors();

    let i = 0;
    let sourceY1 = 0,
      sourceY2 = 0;

    for (; i < anchors.length - 1; i++) {
      sourceY1 = sourceEditor.getTopForLineNumber(anchors[i][sourceKey]);
      sourceY2 = sourceEditor.getTopForLineNumber(anchors[i + 1][sourceKey]);

      if (sourceY >= sourceY1 && sourceY <= sourceY2) {
        break;
      }
    }

    const range = sourceY2 - sourceY1;
    const progress = range === 0 ? 0 : (sourceY - sourceY1) / range;

    const t1Y1 = targetEditor1.getTopForLineNumber(anchors[i][target1Key]);
    const t1Y2 = targetEditor1.getTopForLineNumber(anchors[i + 1][target1Key]);
    targetEditor1.setScrollTop(t1Y1 + progress * (t1Y2 - t1Y1));

    const t2Y1 = targetEditor2.getTopForLineNumber(anchors[i][target2Key]);
    const t2Y2 = targetEditor2.getTopForLineNumber(anchors[i + 1][target2Key]);
    targetEditor2.setScrollTop(t2Y1 + progress * (t2Y2 - t2Y1));

    if (e.scrollLeftChanged) {
      targetEditor1.setScrollLeft(e.scrollLeft);
      targetEditor2.setScrollLeft(e.scrollLeft);
    }

    requestAnimationFrame(() => {
      syncState.isSyncing = false;
    });
  });
};
