import { useMemo } from "react";
import {
  PublishedThreads,
  PublishedThreadsByScope,
} from "./usePublishedThreads";
import { FileData } from "react-diff-view";
import { FileDiff } from "@/types/github.types";
import { getActivePath } from "../_utils/diff-utils";
import { getPublishedThreadsByLine } from "../_utils/comment-utils";

export function usePublishedThreadsByDiff(
  publishedThreads: PublishedThreads,
  diffs: {
    diff: FileData;
    fileMeta?: FileDiff;
  }[],
) {
  return useMemo(() => {
    const publishedThreadsByDiff: Record<string, PublishedThreadsByScope> = {};

    diffs.forEach(({ diff, fileMeta }) => {
      const activePath = getActivePath(diff.type, diff.oldPath, diff.newPath);
      const publishedThreadsByLine = getPublishedThreadsByLine(
        publishedThreads,
        diff.oldPath,
        activePath,
        fileMeta?.status ?? "",
      );
      publishedThreadsByDiff[activePath] = {
        lineThreads: publishedThreadsByLine,
        fileThreads: publishedThreads.get(activePath)?.fileThreads ?? [],
        outdatedThreads:
          publishedThreads.get(activePath)?.outdatedThreads ?? [],
      };
    });

    return publishedThreadsByDiff;
  }, [diffs, publishedThreads]);
}
