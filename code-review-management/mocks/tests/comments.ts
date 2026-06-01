import { ReviewComment, User } from "@/types/github.types";

export function getExampleInlineCommentWithUser(user: User): ReviewComment {
  return {
    pull_request_review_id: 1,
    id: 101,
    diff_hunk: "",
    path: "file.ts",
    commit_id: "abc",
    original_commit_id: "abc",
    user,
    body: "Inline review comment",
    created_at: "2026-01-04T00:00:00Z",
    updated_at: "2026-01-04T00:00:00Z",
    reactions: {
      total_count: 0,
      "+1": 0,
      "-1": 0,
      laugh: 0,
      hooray: 0,
      confused: 0,
      heart: 0,
      rocket: 0,
      eyes: 0,
    },
    author_association: "CONTRIBUTOR",
  };
}
