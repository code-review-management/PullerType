import { User } from "@/types/github.types";
import UserLister from "../UserLister/UserLister";
import { useReviewsQuery } from "@/lib/api/queries/useReviewsQuery";
import { PullParams } from "@/types/routing.types";
import { useParams } from "next/navigation";
import { buildReviewerList } from "../../_utils/userlist-utils";
import { useAutoFetchAllPages } from "@/lib/api/hooks/useAutoFetchAllPages";

/**
 * Reviewers section of the PR view page.
 *
 * @param requested_reviewers List of `User` objects of requested reviewers.
 */
export default function Reviewers({
  requested_reviewers,
}: {
  requested_reviewers: User[];
}) {
  const params = useParams<PullParams>();
  const { username, repo_name, id } = params;
  const {
    data: reviews,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isPending,
    isError,
  } = useReviewsQuery(username, repo_name, id);

  useAutoFetchAllPages(hasNextPage, isFetching, fetchNextPage);

  if (isPending) return <div>Loading reviewers...</div>;
  if (isError) return <div>Failed to load reviewers.</div>;

  const reviewers = buildReviewerList(requested_reviewers, reviews || []);

  return (
    <UserLister listType={"reviewers"} userList={reviewers} editable />
  );
}
