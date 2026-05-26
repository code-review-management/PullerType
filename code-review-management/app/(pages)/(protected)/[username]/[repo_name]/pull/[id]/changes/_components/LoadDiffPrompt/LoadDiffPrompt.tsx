import { Dispatch, SetStateAction } from "react";
import styles from "./LoadDiffPrompt.module.css";

// "size-limit" and "line-limit" currently display the same description.
// Instead of combining them, keep them as separate types for flexibility in
// case we want to be more detailed in the description.
export type LoadDiffReason = "size-limit" | "line-limit" | "removed";

export default function LoadDiffPrompt({
  setIsDiffLoaded,
  reason,
}: {
  setIsDiffLoaded: Dispatch<SetStateAction<boolean>>;
  reason: LoadDiffReason | null;
}) {
  return (
    <div className={styles.container}>
      <button className={styles.load} onClick={() => setIsDiffLoaded(true)}>
        Load diff
      </button>
      {reason && (
        <p className={styles.description} data-testid="description">
          {getDescription(reason)}
        </p>
      )}
    </div>
  );
}

function getDescription(reason: LoadDiffReason): string {
  if (reason === "removed") return "This file was removed.";
  return "Large diffs are not rendered by default.";
}
