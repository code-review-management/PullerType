import refractor from "refractor";
import { Dispatch, memo, SetStateAction, useMemo, useState } from "react";
import { Fragment } from "react/jsx-runtime";
import {
  Decoration,
  Diff,
  FileData,
  GutterOptions,
  Hunk,
  tokenize,
  ViewType,
} from "react-diff-view";

import { DraftThreads, DraftThreadsByLine } from "../../_hooks/useDraftThreads";
import { useHighlight } from "../../_hooks/useHighlight";
import { PublishedThreadsByScope } from "../../_hooks/usePublishedThreads";
import { createDraftThread } from "../../_utils/comment-utils";
import { getActivePath, getLanguage } from "../../_utils/diff-utils";
import { getWidgets } from "../../_utils/widget-utils";
import { FileDiff } from "@/types/github.types";
import { ThreadList } from "../InlineThreadList/InlineThreadList";
import ClearHighlightContext from "../../_contexts/ClearHighlightContext";
import EmptyDiff from "../EmptyDiff/EmptyDiff";
import FileDiffHeader from "../FileDiffHeader/FileDiffHeader";
import Gutter from "../Gutter/Gutter";

import styles from "./FileDiffView.module.css";
import "prism-color-variables/variables.css";
import "react-diff-view/style/index.css";
import "./ReactDiffView.css";

/**
 * Docs:
 * 1. https://github.com/otakustay/react-diff-view?tab=readme-ov-file#render-diff-hunks
 */

export default memo(function FileDiffView({
  diff,
  fileMeta,
  viewType,
  publishedThreads,
  draftThreadsByLine,
  setDraftThreads,
}: {
  diff: FileData;
  fileMeta?: FileDiff;
  viewType: ViewType;
  publishedThreads: PublishedThreadsByScope;
  draftThreadsByLine: DraftThreadsByLine | undefined; // Undefined when there are no draft threads in the current file.
  setDraftThreads: Dispatch<SetStateAction<DraftThreads>>;
}) {
  const { type: diffType, oldPath, newPath, hunks } = diff;
  const activePath = getActivePath(diffType, oldPath, newPath);
  const { activeHighlight, highlightEvents, clearHighlight } = useHighlight(
    oldPath,
    activePath,
    fileMeta?.status ?? "",
    setDraftThreads,
  );
  const [isExpanded, setIsExpanded] = useState(true);

  // Use memoization to reduce lag while highlighting.
  const tokens = useMemo(
    () =>
      tokenize(hunks, {
        highlight: true,
        refractor: refractor,
        language: getLanguage(activePath),
      }),
    [activePath, hunks],
  );

  // Use memoization to avoid re-calculations of widgets while highlighting.
  const widgets = useMemo(
    () =>
      getWidgets(
        activePath,
        hunks,
        publishedThreads.lineThreads,
        draftThreadsByLine ?? {},
      ),
    [activePath, hunks, publishedThreads.lineThreads, draftThreadsByLine],
  );

  const renderGutter = ({ change, side, renderDefault }: GutterOptions) => (
    <Gutter
      change={change}
      side={side}
      renderDefault={renderDefault}
      activeHighlight={activeHighlight}
    />
  );

  const hasFileLevelThreads =
    publishedThreads.fileThreads.length > 0 ||
    draftThreadsByLine?.["file-level"];

  return (
    <ClearHighlightContext value={{ clearHighlight }}>
      <div
        className={`${styles.fileDiffView} ${activeHighlight.isHighlighting ? styles.isHighlighting : ""}`}
        id={`file-${activePath}`}
      >
        <FileDiffHeader
          fileMeta={fileMeta}
          diffType={diffType}
          oldPath={oldPath}
          newPath={newPath}
          isExpanded={isExpanded}
          setIsExpanded={setIsExpanded}
          createFileDraftThread={() =>
            createDraftThread(setDraftThreads, activePath, {
              oldPath,
              activePath,
              fileStatus: fileMeta?.status ?? "",
              body: "",
              subjectType: "file",
            })
          }
        />
        <div className={!isExpanded ? styles.collapsed : ""}>
          {hasFileLevelThreads && (
            <ThreadList
              publishedThreads={publishedThreads.fileThreads}
              draftThread={draftThreadsByLine?.["file-level"]}
            />
          )}
          {hunks.length > 0 ? (
            <Diff
              viewType={viewType}
              diffType={diffType}
              hunks={hunks}
              tokens={tokens}
              widgets={widgets}
              renderGutter={renderGutter}
              gutterEvents={highlightEvents}
            >
              {(hunks) =>
                hunks.map((hunk) => (
                  <Fragment key={hunk.content}>
                    <Decoration>{hunk.content}</Decoration>
                    <Hunk hunk={hunk} />
                  </Fragment>
                ))
              }
            </Diff>
          ) : (
            <EmptyDiff diff={diff} fileMeta={fileMeta} />
          )}
        </div>
      </div>
    </ClearHighlightContext>
  );
});
