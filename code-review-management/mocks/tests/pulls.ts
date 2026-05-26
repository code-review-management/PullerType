import { PullRequest } from "@/types/github.types";
import { getDefaultBranch } from "./branches";
import { getDefaultUser, getExampleUser1, getExampleUser2 } from "./users";
import { getExampleRepo1 } from "./repos";

export function getDefaultPull(): PullRequest {
  return {
    url: "",
    id: 0,
    html_url: "",
    number: 0,
    state: "open",
    locked: false,
    title: "",
    user: getDefaultUser(),
    body: "",
    created_at: "",
    updated_at: "",
    closed_at: null,
    merged_at: null,
    assignees: [],
    requested_reviewers: [],
    head: getDefaultBranch(),
    base: getDefaultBranch(),
    author_association: "CONTRIBUTOR",
    draft: false,
    assignee: null,
  };
}

export function getExamplePull1(): PullRequest {
  return {
    url: "",
    id: 1,
    html_url: "",
    number: 123,
    state: "open",
    locked: false,
    title: "1fjads02kd@^nb9",
    user: getExampleUser1(),
    body: "3490jfk$@#da90uqhfi!eii09ruqhef-093u",
    created_at: "",
    updated_at: "",
    closed_at: null,
    merged_at: null,
    assignees: [getExampleUser1()],
    requested_reviewers: [getExampleUser2()],
    head: {
      label: "",
      ref: "example-head-ref",
      sha: "",
      user: getExampleUser1(),
      repo: getExampleRepo1(),
    },
    base: {
      label: "",
      ref: "example-base-ref",
      sha: "",
      user: getExampleUser1(),
      repo: getExampleRepo1(),
    },
    author_association: "CONTRIBUTOR",
    draft: false,
    assignee: null,
    review_comments: 0,
    commits: 3,
    additions: 123,
    deletions: 5,
    changed_files: 4,
  };
}
