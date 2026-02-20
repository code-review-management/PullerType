import refractor from "refractor";
import { Dispatch, SetStateAction, useState } from "react";
import { Fragment } from "react/jsx-runtime";
import { Roboto_Mono } from "next/font/google";
import {
  Decoration,
  Diff,
  FileData,
  Hunk,
  HunkData,
  tokenize,
  ViewType,
} from "react-diff-view";

import { Drafts } from "../../_hooks/useDrafts";
import { useHighlighting } from "../../_hooks/useHighlighting";
import { PublishedThreadsByLine } from "../../_hooks/usePublishedThreads";
import { getCommentWidgets, getLanguage } from "../../_utils/diff-utils";
import FileDiffHeader from "../FileDiffHeader/FileDiffHeader";

import styles from "./FileDiffView.module.css";
import "prism-color-variables/variables.css";
import "react-diff-view/style/index.css";
import "./ReactDiffView.css";

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

/**
 * Docs:
 * 1. https://github.com/otakustay/react-diff-view?tab=readme-ov-file#render-diff-hunks
 */

export default function FileDiffView({
  oldRevision,
  newRevision,
  oldPath,
  newPath,
  diffType,
  viewType,
  hunks,
  publishedThreadsByLine,
  drafts,
  setDrafts,
}: {
  oldRevision: string;
  newRevision: string;
  oldPath: string;
  newPath: string;
  diffType: FileData["type"];
  viewType: ViewType;
  hunks: HunkData[];
  publishedThreadsByLine: PublishedThreadsByLine;
  drafts: Drafts;
  setDrafts: Dispatch<SetStateAction<Drafts>>
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { selectedChanges, highlightEvents } = useHighlighting();

  const tokens = tokenize(hunks, {
    highlight: true,
    refractor: refractor,
    language: getLanguage(diffType === "delete" ? oldPath : newPath),
  });
  const widgets = getCommentWidgets(hunks, publishedThreadsByLine);

  return (
    <div className={`${styles.fileDiffView} ${robotoMono.variable}`}>
      <FileDiffHeader
        diffType={diffType}
        oldPath={oldPath}
        newPath={newPath}
        isExpanded={isExpanded}
        setIsExpanded={setIsExpanded}
      />
      <div>
        {isExpanded && (
          <Diff
            key={oldRevision + "-" + newRevision}
            viewType={viewType}
            diffType={diffType}
            hunks={hunks}
            tokens={tokens}
            widgets={widgets}
            selectedChanges={selectedChanges}
            {...highlightEvents}
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
        )}
      </div>
    </div>
  );
}
