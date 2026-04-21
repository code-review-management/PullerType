import Image from "next/image";
import InfoIcon from "@/public/icons/info.svg";
import styles from "./CommitViewBanner.module.css";

/**
 * Banner to display at the bottom of the changes page when in commit-viewing
 * mode.
 *
 * @param sha: SHA of the commit currently viewing.
 */
export default function CommitViewBanner({ sha }: { sha: string }) {
  return (
    <div className={styles.banner} data-testid="commit-view-banner">
      <Image src={InfoIcon} alt="Info" className={styles.infoIcon} />
      Commenting is disabled while viewing commit{" "}
      <span className={styles.sha}>{sha.slice(0, 7)}</span>
    </div>
  );
}
