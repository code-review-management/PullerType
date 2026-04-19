import Image from "next/image";
import { Dispatch, SetStateAction, useState } from "react";
import { FileData } from "react-diff-view";
import { FileDiff } from "@/types/github.types";
import ChevronDownIcon from "@/public/icons/chevron_down.svg";
import ChevronRightIcon from "@/public/icons/chevron_right.svg";
import CommentIcon from "@/public/icons/comment.svg";
import FileStatusChip from "../FileStatusChip/FileStatusChip";
import styles from "./FileDiffHeader.module.css";

export default function FileDiffHeader({
  fileMeta,
  diffType,
  oldPath,
  newPath,
  isExpanded,
  setIsExpanded,
}: {
  fileMeta?: FileDiff;
  diffType: FileData["type"];
  oldPath: string;
  newPath: string;
  isExpanded: boolean;
  setIsExpanded: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <div
      className={`${styles.fileDiffHeader} ${!isExpanded ? styles.collapsed : ""}`}
    >
      <div className={styles.fileInfo}>
        <Image
          src={isExpanded ? ChevronDownIcon : ChevronRightIcon}
          alt={`Chevron icon pointing ${isExpanded ? "down" : "right"}`}
          className={styles.chevron}
          onClick={() => setIsExpanded((prev) => !prev)}
          data-tooltip-id={`collapse-expand-diff-${oldPath}-${newPath}`}
          data-tooltip-content={isExpanded ? "Collapse" : "Expand"}
          data-tooltip-place="bottom"
          data-tooltip-delay-show={100}
        />
        {fileMeta?.status === "renamed" ? (
          <>
            <TruncatedPath path={oldPath} />
            <p>&rarr;</p>
            <TruncatedPath path={newPath} />
          </>
        ) : (
          <TruncatedPath path={diffType === "delete" ? oldPath : newPath} />
        )}
        {fileMeta && (
          <div className={styles.meta}>
            <ChangeCount
              additions={fileMeta.additions}
              deletions={fileMeta.deletions}
            />
            <FileStatusChip status={fileMeta.status} />
          </div>
        )}
      </div>
      <button className={styles.comment}>
        <Image src={CommentIcon} alt="File-level comment" />
      </button>
    </div>
  );
}

function ChangeCount({
  additions,
  deletions,
}: {
  additions: number;
  deletions: number;
}) {
  if (additions < 1 && deletions < 1) return null;

  return (
    <div className={styles.lineNumbers}>
      {deletions > 0 && <p className={styles.deletions}>-{deletions}</p>}
      {additions > 0 && <p className={styles.additions}>+{additions}</p>}
    </div>
  );
}

function TruncatedPath({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(path);
    setCopied(true);
  };

  return (
    <p
      className={styles.path}
      onClick={handleCopy}
      data-tooltip-id={`tooltip-copy-${path}`}
      data-tooltip-content={copied ? "Copied" : "Copy"}
      data-tooltip-place="bottom"
      data-tooltip-delay-show={100}
      onMouseLeave={() => setTimeout(() => setCopied(false), 200)} // Reset after fade-out to avoid briefly showing "Copy"
    >
      <span className={styles.pathText}>{path}</span>
    </p>
  );
}
