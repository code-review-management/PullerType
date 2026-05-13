import { useParams } from "next/navigation";
import { useRouter } from "@bprogress/next/app";
import { PullParams } from "@/types/routing.types";
import { useChangesViewMode } from "../../_hooks/useChangesViewMode";
import { useCommitPickerContext } from "../../../_contexts/CommitPickerContext";
import { usePermissionChecks } from "../../../_hooks/usePermissionChecks";
import Image from "next/image";
import InfoIcon from "@/public/icons/info.svg";
import styles from "./CommitViewBanner.module.css";

export default function CommitViewBanner({ sha }: { sha: string }) {
  const router = useRouter();
  const { username, repo_name, id } = useParams<PullParams>();
  const { setSelectedSha } = useCommitPickerContext();
  const { mode } = useChangesViewMode();
  const { hasCommentPermission } = usePermissionChecks();

  const modeMessage =
    mode === "cumulative-commit"
      ? `viewing changes from merge base to commit `
      : `viewing commit `;

  const bannerText = hasCommentPermission
    ? `Commenting disabled \u2014 ${modeMessage}`
    : modeMessage[0].toUpperCase() + modeMessage.slice(1);

  return (
    <div className={styles.banner} data-testid="commit-view-banner">
      <Image src={InfoIcon} alt="Info" className={styles.infoIcon} />
      {bannerText}
      <span className={styles.sha}>{sha.slice(0, 7)}</span>
      <button
        className={styles.backButton}
        onClick={() => {
          setSelectedSha(null);
          router.push(`/${username}/${repo_name}/pull/${id}/changes`);
        }}
      >
        Back to all changes
      </button>
    </div>
  );
}
