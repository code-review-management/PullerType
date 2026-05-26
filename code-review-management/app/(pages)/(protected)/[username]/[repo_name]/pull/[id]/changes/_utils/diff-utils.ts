import refractor from "refractor";
import path from "path";
import { ChangeData, FileData, HunkData } from "react-diff-view";
import { Side } from "react-diff-view/types/interface";
import { FileDiff } from "@/types/github.types";
import { LoadDiffReason } from "../_components/LoadDiffPrompt/LoadDiffPrompt";
import { buildPathTreeIndexMap } from "./filetree-utils";

export function getLineNumber(change: ChangeData, side: Side) {
  if (change.type === "delete" || change.type === "insert") {
    return change.lineNumber;
  }
  // Executes when change.type === "normal":
  return side === "new" ? change.newLineNumber : change.oldLineNumber;
}

export function getActivePath(
  diffType: FileData["type"],
  oldPath: string,
  newPath: string,
) {
  return diffType === "delete" ? oldPath : newPath;
}

export function getLanguage(filename: string) {
  const fileExtension = path.extname(filename).slice(1);

  if (refractor.registered(fileExtension)) {
    return fileExtension;
  } else {
    return "txt";
  }
}

export function toGitHubSide(side: Side) {
  return side === "old" ? "LEFT" : "RIGHT";
}

/**
 * Overrides filenames extracted by react-diff-view by parsing the diff-string
 * ourselves. In the diff-string, each file-diff begins with a header that looks
 * like "diff --git a/file1 b/file2". According to git docs, "a/" and "b/"
 * filenames are the same unless rename/copy is involved. react-diff-view
 * already handles rename/copy correctly since they extract those filenames
 * from separate headers that start with "rename from..." and "rename to...".
 *
 * To parse the filenames from the "diff --git " lines, we extract the string
 * "a/file1 b/file2" and split it exactly in half since it should be symmetric.
 * To ensure correctness, we will only override the paths if our results are as
 * expected (the split occurs at a space, the two split strings start with "a/"
 * and "b/", and "file1" is equal to "file2").
 *
 * We process the diff string from top-to-bottom since the react-diff-view
 * parser processes it in the same order and pushes it into an array.
 *
 * Docs: https://git-scm.com/docs/diff-format#generate_patch_text_with_p
 *
 * @param diffString: The raw diff-string.
 * @param parsedDiffs: The diff-string data parsed by react-diff-view.
 */
export function fixParsedDiffPaths(
  diffString: string,
  parsedDiffs: FileData[],
) {
  const stripTrailingTab = (path: string) =>
    path.endsWith("\t") ? path.slice(0, -1) : path;

  const DIFF_GIT_PREFIX = "diff --git ";
  // Match all lines that start with "diff --git ".
  const diffGitLines = diffString.match(/^diff --git .*/gm) ?? [];

  if (diffGitLines.length !== parsedDiffs.length) return;
  diffGitLines.forEach((line, i) => {
    const parsed = parsedDiffs[i];
    if (!parsed || parsed.type === "rename" || parsed.type === "copy") return;

    parsed.oldPath = stripTrailingTab(parsed.oldPath);
    parsed.newPath = stripTrailingTab(parsed.newPath);

    const paths = line.slice(DIFF_GIT_PREFIX.length);
    const mid = Math.floor(paths.length / 2);
    if (paths[mid] !== " ") return;

    const aPrefixed = paths.slice(0, mid);
    const bPrefixed = paths.slice(mid + 1);

    if (!aPrefixed.startsWith("a/") || !bPrefixed.startsWith("b/")) return;

    const oldPath = aPrefixed.slice(2);
    const newPath = bPrefixed.slice(2);
    if (oldPath !== newPath) return;

    parsed.oldPath = oldPath;
    parsed.newPath = newPath;
  });
}

/**
 * Creates a unique ID for a file-diff. URL encodes the spaces – required for
 * the edge case when there are multiple files whose paths only differ by the
 * amounts of trailing whitespace at the end.
 *
 * Docs: https://stackoverflow.com/a/72073207
 *
 * @param path: Active path of file-diff.
 */
export function createFileDiffId(activePath: string) {
  return `file-${activePath.replace(/\s/g, "%20")}`;
}

export function getLoadDiffReason(
  hunks: HunkData[],
  fileMeta?: FileDiff,
): LoadDiffReason | null {
  if (fileMeta?.status === "removed") return "removed";
  if (isDiffAtLeast100KB(hunks)) return "size-limit";
  if (isDiffOver500Lines(hunks)) return "line-limit";
  return null;
}

function isDiffAtLeast100KB(hunks: HunkData[]) {
  // Docs: https://stackoverflow.com/a/57899756
  const encoder = new TextEncoder();
  let bytes = 0;
  for (const hunk of hunks) {
    for (const change of hunk.changes) {
      bytes += encoder.encode(change.content).length;
      if (bytes >= 100 * 1024) return true;
    }
  }
  return false;
}

function isDiffOver500Lines(hunks: HunkData[]) {
  return hunks.reduce((sum, hunk) => sum + hunk.changes.length, 0) > 500;
}

export function buildFileDiffMap(
  parsedDiffs: FileData[],
  flatFileTree: FileDiff[],
) {
  const pathTreeIndexMap = buildPathTreeIndexMap(flatFileTree);
  let unmatched = false;

  const diffs = parsedDiffs.map((diff) => {
    const activePath = getActivePath(diff.type, diff.oldPath, diff.newPath);
    const idx = pathTreeIndexMap.get(activePath);

    if (idx === undefined) unmatched = true;
    const fileMeta = idx !== undefined ? flatFileTree[idx] : undefined;
    return { diff, fileMeta };
  });

  return {
    diffs,
    isMappingError: unmatched || parsedDiffs.length !== flatFileTree.length,
  };
}
