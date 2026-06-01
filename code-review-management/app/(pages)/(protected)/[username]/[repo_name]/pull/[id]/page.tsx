"use client";
import Divider from "@/app/(pages)/_components/Divider/Divider";
import PullBodyDescription from "./_components/PullBodyDescription/PullBodyDescription";
import PullBodyHeader from "./_components/PullBodyHeader/PullBodyHeader";
import styles from "./page.module.css";
import StatusSection from "./_components/StatusSection/StatusSection";
import Reviewers from "./_components/Reviewers/Reviewers";
import Assignees from "./_components/Assignees/Assignees";
import PRHeader from "./_components/PRHeader/PRHeader";
import { useParams } from "next/navigation";
import { PullParams } from "@/types/routing.types";
import { usePullQuery } from "@/lib/api/queries/usePullQuery";
import PRViewTimeline from "./_components/PRViewTimeline/PRViewTimeline";
import IconTooltip from "@/app/(pages)/_components/IconTooltip/IconTooltip";
import LoadingSpinner from "@components/LoadingSpinner/LoadingSpinner";

// Pull Request View page.
export default function Pull() {
  const params = useParams<PullParams>();
  const { username, repo_name, id } = params;
  const { data, isPending, isError } = usePullQuery(username, repo_name, id);

  // TODO: Replace with proper error UI.
  if (isPending) return <LoadingSpinner centered forPageLevel />;
  if (isError) return <div>Failed to load pull request.</div>;

  return (
    <div className={styles.page}>
      <PRHeader pull={data} />
      <div className={styles.pageBody}>
        <div className={styles.bodyUpper}>
          <div className={styles.bodyUpperLeft}>
            <PullBodyHeader pullData={data} />
            <Divider />
          </div>
          <div className={styles.infoColumnTop}>
            <StatusSection pullData={data} />
            <Divider />
          </div>
        </div>
        <div className={styles.bodyLower}>
          <div className={styles.bodyMain}>
            <PullBodyDescription
              username={data.user?.login || ""}
              createdAt={data.created_at}
              description={data.body || ""}
              avatarUrl={data.user?.avatar_url || ""}
            />
            <PRViewTimeline username={username} repoName={repo_name} id={id} />
          </div>
          <div className={styles.infoColumn}>
            <div
              className={`${styles.infoColumnTop} ${styles.infoColumnTopSmallScreen}`}
            >
              <StatusSection pullData={data} />
              <Divider />
            </div>
            <Reviewers requested_reviewers={data.requested_reviewers || []} />
            <Divider />
            <Assignees assignees={data.assignees || []} />
            <Divider />
          </div>
        </div>
      </div>
      <IconTooltip id={"userlister-icon"} positionStrategy="fixed" />
    </div>
  );
}
