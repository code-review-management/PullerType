import { ChangeData } from "react-diff-view";
import { getLineNumber } from "../../_utils/diff-utils";
import { HighlightPosition } from "../../_hooks/useHighlighting";
import { ReactNode } from "react";

export default function Gutter({
  change,
  side,
  renderDefault,
  highlightedLines,
  highlightStart,
}: {
  change: ChangeData;
  side: "new" | "old";
  renderDefault: () => ReactNode;
  highlightedLines: Set<number>;
  highlightStart: HighlightPosition | null;
}) {
  const lineNumber = getLineNumber(change, side);
  const isHighlighted =
    highlightStart &&
    side === highlightStart.side &&
    highlightedLines.has(lineNumber);

  return (
    <div className={isHighlighted ? "highlighted" : ""}>{renderDefault()}</div>
  );
}
