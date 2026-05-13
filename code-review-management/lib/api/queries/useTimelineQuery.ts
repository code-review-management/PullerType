import { InfiniteData, useInfiniteQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api/utils/fetcher";
import { TimelineEventV2 } from "@/types/github.types.wrapper";
import { useCallback } from "react";

/**
 * Fetches timeline events for a GitHub pull request.
 * Supports pagination.
 *
 * @param owner: Owner of the repository.
 * @param repo: Name of the repository.
 * @param pullNumber: Pull request number.
 * @returns: TanStack query result containing the timeline data.
 */
export function useTimelineQuery(
  owner: string,
  repo: string,
  pullNumber: string,
) {
  return useInfiniteQuery({
    queryKey: ["timeline", owner, repo, pullNumber],
    queryFn: async ({ pageParam }): Promise<TimelineEventV2> =>
      fetcher(
        `/api/v2/${owner}/${repo}/pulls/${pullNumber}/timeline?page=${pageParam}`,
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.next,
    getPreviousPageParam: (firstPage) => firstPage.prev,
    select: useCallback((data: InfiniteData<TimelineEventV2, number>) => {
      return data.pages.flatMap((page) => page.data);
    }, []),
  });
}
