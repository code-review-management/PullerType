import Image from "next/image";
import styles from "./BranchDisplay.module.css";
import IconTooltip from "@/app/(pages)/_components/IconTooltip/IconTooltip";
import { useState } from "react";

export default function BranchDisplay({
  headRef,
  baseRef,
}: {
  headRef: string;
  baseRef: string;
}) {
  return (
    <div className={styles.branchDisplay}>
      <BranchChip ref={headRef} />
      <Image
        src="/icons/merge_direction.svg"
        width={16}
        height={12}
        alt="Right arrow"
      />
      <BranchChip ref={baseRef} />
      <IconTooltip id="branch-name-tooltips" />
    </div>
  );
}

function BranchChip({ ref }: { ref: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(ref);
    setCopied(true);
  };
  return (
    <div
      onClick={handleCopy}
      className={styles.branchChip}
      data-tooltip-id="branch-name-tooltips"
      data-tooltip-content={
        copied ? `${ref} (Copied!)` : `${ref} (Click to copy)`
      }
      data-tooltip-delay-show={100}
      onMouseLeave={() => setTimeout(() => setCopied(false), 200)} // Reset after fade-out to avoid briefly showing "Copy"
    >
      <p className={styles.branchName}>{ref}</p>
    </div>
  );
}
