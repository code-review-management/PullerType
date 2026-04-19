import { useParams } from "next/navigation";
import { useMemo } from "react";
import { parseDiff } from "react-diff-view";
import { useDraftThreadsContext } from "../../_contexts/DraftThreadsContext";
import { useFileDiffsQuery } from "@/lib/api/queries/useFileDiffsQuery";
import { usePublishedThreadsByDiff } from "../../_hooks/usePublishedThreadsByDiff";
import { FileDiff } from "@/types/github.types";
import { PullParams } from "@/types/routing.types";
import { PublishedThreads } from "../../_hooks/usePublishedThreads";
import { getActivePath } from "../../_utils/diff-utils";
import { orderParsedDiffs } from "../../_utils/filetree-utils";
import FileDiffView from "../FileDiffView/FileDiffView";
import IconTooltip from "@components/IconTooltip/IconTooltip";
import styles from "./DiffListView.module.css";

export default function DiffListView({
  flatFileTree,
  publishedThreads,
}: {
  flatFileTree: FileDiff[];
  publishedThreads: PublishedThreads;
}) {
  const { username, repo_name, id } = useParams<PullParams>();
  const { draftThreads, setDraftThreads } = useDraftThreadsContext();
  const {
    data: diffString,
    isPending,
    isError,
  } = useFileDiffsQuery(username, repo_name, id);

  const diffs = useMemo(() => {
    if (!diffString) return []; // Fallback to handle type errors, but won't render during loading/error state.
    const parsedDiffs = parseDiff(diffString, { nearbySequences: "zip" });
    orderParsedDiffs(parsedDiffs, flatFileTree);
    // Ordered `parsedDiffs` array has 1-1 matching with ordered `flatFileTree` array.
    return parsedDiffs.map((diff, index) => ({
      diff,
      fileMeta: flatFileTree.at(index),
    }));
  }, [diffString, flatFileTree]);

  const publishedThreadsByDiff = usePublishedThreadsByDiff(
    publishedThreads,
    diffs,
  );

  // TODO: Replace with proper loading/error UI.
  if (isPending) return <div>Loading diffs...</div>;
  if (isError) return <div>Failed to load diffs.</div>;

  return (
    <div className={styles.diffListView}>
      {diffs.map(({ diff, fileMeta }) => {
        const activePath = getActivePath(diff.type, diff.oldPath, diff.newPath);
        const diffId = diff.oldPath + "-" + diff.newPath;
        const tooltips = (
          <>
            <IconTooltip id={`tooltip-collapse-diff-${diffId}`} />
            <IconTooltip id={`tooltip-file-comment-${diffId}`} />
            <IconTooltip id={`tooltip-copy-${diff.oldPath}`} />
            <IconTooltip id={`tooltip-copy-${diff.newPath}`} />
          </>
        );

        return (
          <div key={diffId}>
            {tooltips}
            <FileDiffView
              diff={diff}
              fileMeta={fileMeta}
              viewType="split"
              publishedThreads={publishedThreadsByDiff[activePath]}
              draftThreadsByLine={draftThreads[activePath]}
              setDraftThreads={setDraftThreads}
            />
          </div>
        );
      })}
    </div>
  );
}
