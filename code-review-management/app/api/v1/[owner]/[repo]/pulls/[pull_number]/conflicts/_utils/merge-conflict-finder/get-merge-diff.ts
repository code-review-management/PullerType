import * as Diff3 from "node-diff3";

export interface FileMergeOutput {
  hasConflict: boolean;
  content: string;
}

interface Diff3MergeResult {
  conflict: boolean;
  result: string[];
}

export const attemptFileMerge = (
  ancestor: string,
  target: string,
  feature: string,
): FileMergeOutput => {
  const base = ancestor.split("\n");
  const theirs = target.split("\n");
  const ours = feature.split("\n");

  const mergeOutput: Diff3MergeResult = Diff3.merge(ours, base, theirs);
  const content = mergeOutput.result.join("\n");
  return {
    hasConflict: mergeOutput.conflict,
    content: content,
  };
};
