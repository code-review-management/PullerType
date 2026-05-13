import { InfiniteData, useInfiniteQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api/utils/fetcher";
import { ReviewV2 } from "@/types/github.types.wrapper";
import { useCallback } from "react";

/**
 * Fetches list of reviews for a given PR.
 *
 * @returns: TanStack query result containing the review data.
 */
export function useReviewsQuery(
  owner: string,
  repo: string,
  pullNumber: string,
) {
  return useInfiniteQuery({
    queryKey: ["reviews", owner, repo, pullNumber],
    queryFn: async ({ pageParam }): Promise<ReviewV2> =>
      fetcher(
        `/api/v2/${owner}/${repo}/pulls/${pullNumber}/reviews?page=${pageParam}`,
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.next,
    getPreviousPageParam: (firstPage) => firstPage.prev,
    select: useCallback((data: InfiniteData<ReviewV2, number>) => {
      return data.pages.flatMap((page) => page.data);
    }, []),
  });
}
