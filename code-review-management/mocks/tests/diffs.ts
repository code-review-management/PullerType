import { ActiveHighlight } from "@/app/(pages)/(protected)/[username]/[repo_name]/pull/[id]/changes/_hooks/useHighlight";
import { ChangeData } from "react-diff-view";

export function getDefaultInsertChangeData(): ChangeData {
  return {
    type: "insert",
    content: "insert-content",
    lineNumber: 1,
    isInsert: true,
  };
}

export function getDefaultActiveHighlight(): ActiveHighlight {
  return {
    isHighlighting: false,
    side: "new",
    start: 1,
    end: 5,
  };
}
