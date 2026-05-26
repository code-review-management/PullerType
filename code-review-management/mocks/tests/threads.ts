import { DraftThreadItem } from "@/app/(pages)/(protected)/[username]/[repo_name]/pull/[id]/changes/_hooks/useDraftThreads";
import { PublishedThreadItem } from "@/app/(pages)/(protected)/[username]/[repo_name]/pull/[id]/changes/_hooks/usePublishedThreads";

type FileDraftThreadItem = Extract<DraftThreadItem, { subjectType: "file" }>;
type LineDraftThreadItem = Extract<DraftThreadItem, { subjectType: "line" }>;

export function getExampleLinePublishedThreadItem1(): PublishedThreadItem {
  return {
    id: 1,
    path: "filename.ts",
    original_start_line: 1,
    original_line: 5,
    start_line: 1,
    line: 5,
    start_side: "LEFT",
    side: "LEFT",
    subject_type: "line",
    comments: [],
  };
}

export function getExampleFileDraftThreadItem1(): FileDraftThreadItem {
  return {
    oldPath: "old.ts",
    activePath: "active.ts",
    fileStatus: "modified",
    body: "content",
    subjectType: "file",
  };
}

export function getExampleLineDraftThreadItem1(): LineDraftThreadItem {
  return {
    oldPath: "old.ts",
    activePath: "active.ts",
    fileStatus: "modified",
    body: "content",
    subjectType: "line",
    start: 1,
    end: 5,
    side: "new",
  };
}

export function getLineDraftThreadItemVariants() {
  const base = getExampleLineDraftThreadItem1();
  return {
    SINGLE_LINE_NEW_SIDE: { ...base, start: 5, end: 5, side: "new" },
    SINGLE_LINE_OLD_SIDE: { ...base, start: 5, end: 5, side: "old" },
    MULTI_LINE_NEW_SIDE: { ...base, start: 1, end: 5, side: "new" },
    MULTI_LINE_OLD_SIDE: { ...base, start: 1, end: 5, side: "old" },
  } satisfies Record<string, LineDraftThreadItem>;
}
