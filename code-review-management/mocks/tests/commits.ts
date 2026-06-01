import { Commit } from "@/types/github.types";
import { getExampleUser1, getExampleUser2 } from "./users";

export function getDefaultCommit(sha: string = "test-commit-sha"): Commit {
  return {
    url: "test-url",
    sha,
    html_url: "test-html-url",
    commit: {
      message: "test-commit-message",
      author: {
        date: "test-author-date",
        email: "test-author-email",
        name: "test-author-name",
      },
      committer: {
        date: "test-committer-date",
        email: "test-committer-email",
        name: "test-committer-name",
      },
    },
    author: getExampleUser1(),
    committer: getExampleUser2(),
    stats: {
      additions: 5,
      deletions: 2,
      total: 7,
    },
    files: [],
  };
}

export function getDefaultCommitList(count: number = 5): Commit[] {
  return Array.from({ length: count }, (_, idx) =>
    getDefaultCommit(`${idx}-test-commit-sha`),
  );
}
