import { ActiveHighlight } from "@/app/(pages)/(protected)/[username]/[repo_name]/pull/[id]/changes/_hooks/useHighlight";
import { ChangeData } from "react-diff-view";

type InsertChange = Extract<ChangeData, { type: "insert" }>;
type DeleteChange = Extract<ChangeData, { type: "delete" }>;
type NormalChange = Extract<ChangeData, { type: "normal" }>;

export function getDefaultInsertChangeData(
  overrides: Partial<InsertChange> = {},
): InsertChange {
  return {
    type: "insert",
    content: "insert-content",
    lineNumber: 1,
    isInsert: true,
    ...overrides,
  };
}

export function getDefaultDeleteChangeData(
  overrides: Partial<DeleteChange> = {},
): DeleteChange {
  return {
    type: "delete",
    content: "delete-content",
    lineNumber: 2,
    isDelete: true,
    ...overrides,
  };
}

export function getDefaultNormalChangeData(
  overrides: Partial<NormalChange> = {},
): NormalChange {
  return {
    type: "normal",
    content: "normal-content",
    oldLineNumber: 3,
    newLineNumber: 5,
    isNormal: true,
    ...overrides,
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
