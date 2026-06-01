import { useState } from "react";
import { useParams } from "next/navigation";
import { useChangesViewMode } from "../../_hooks/useChangesViewMode";
import { PublishedThreads } from "../../_hooks/usePublishedThreads";
import { FileDiff } from "@/types/github.types";
import { PullParams } from "@/types/routing.types";
import {
  buildThreadIndexMap,
  buildThreadStatusMap,
  sortPublishedThreads,
} from "../../_utils/comment-utils";
import Image from "next/image";
import AlertBanner from "@components/AlertBanner/AlertBanner";
import CancelButton from "@components/CancelButton/CancelButton";
import CommentDiscussionIcon from "@/public/icons/comment_discussion.svg";
import IconTooltip from "@components/IconTooltip/IconTooltip";
import InlinePublishedThread from "../InlinePublishedThread/InlinePublishedThread";
import TimelineDisplay from "../../../_components/TimelineDisplay/TimelineDisplay";
import styles from "./ActivityPanel.module.css";

// Docs: https://stackoverflow.com/a/62900613
const TABS = ["Comments", "Timeline"] as const;
export type ActivityPanelTabs = (typeof TABS)[number];

export default function ActivityPanel({
  publishedThreads,
  flatFileTree,
  isOpen,
  togglePanel,
}: {
  publishedThreads: PublishedThreads;
  flatFileTree: FileDiff[];
  isOpen: boolean;
  togglePanel: () => void;
}) {
  const { username, repo_name, id } = useParams<PullParams>();
  const [activeTab, setActiveTab] = useState<ActivityPanelTabs>("Comments");

  return (
    <div
      className={`${styles.panelWrapper} ${!isOpen ? styles.panelWrapperClosed : ""}`}
    >
      <div className={styles.panel}>
        <div className={styles.header}>
          {TABS.map((tab) => (
            <div
              key={tab}
              className={`${styles.tab} ${activeTab === tab ? styles.activeTab : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </div>
          ))}
          <div className={styles.close}>
            <CancelButton
              onClick={() => togglePanel()}
              tooltipContent="Close panel"
              size={13}
            />
          </div>
        </div>
        <div className={styles.body}>
          {activeTab === "Comments" ? (
            <CommentsTab
              publishedThreads={publishedThreads}
              flatFileTree={flatFileTree}
            />
          ) : (
            <div className={styles.timeline} data-view="activity-panel">
              <TimelineDisplay
                username={username}
                repoName={repo_name}
                id={id}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CommentsTab({
  publishedThreads,
  flatFileTree,
}: {
  publishedThreads: PublishedThreads;
  flatFileTree: FileDiff[];
}) {
  const { mode } = useChangesViewMode();
  const allThreads = [...publishedThreads.values()].flatMap((byGroup) => {
    const lineThreads = [...byGroup.lineThreads.values()].flatMap(
      ({ left, right }) => [...left, ...right],
    );
    return [...byGroup.fileThreads, ...byGroup.outdatedThreads, ...lineThreads];
  });

  const threadIndexMap = buildThreadIndexMap(allThreads, flatFileTree);
  const threadStatusMap = buildThreadStatusMap(allThreads, threadIndexMap);
  sortPublishedThreads(
    allThreads,
    flatFileTree,
    threadIndexMap,
    threadStatusMap,
  );

  return (
    <>
      {allThreads.length === 0 ? (
        <div className={styles.emptyCommentsMessage}>
          <Image
            src={CommentDiscussionIcon}
            alt="Comment activity"
            height={24}
            width={24}
          />
          No comments on files yet.
        </div>
      ) : (
        <>
          {mode !== "pr" && (
            <div className={styles.commitCommentsAlert}>
              <AlertBanner>
                These comments are visible on the latest version of the PR. Exit
                commit view to see them inline.
              </AlertBanner>
            </div>
          )}
          {allThreads.map((thread) => (
            <div key={`${thread.path}-${thread.id}`} className={styles.thread}>
              <InlinePublishedThread
                thread={thread}
                viewType="panel"
                status={threadStatusMap.get(thread)}
              />
            </div>
          ))}
        </>
      )}
      <IconTooltip
        id="thread-header-tooltip"
        positionStrategy="fixed"
        maxWidth={"225px"}
      />
    </>
  );
}
