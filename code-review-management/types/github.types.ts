import * as z from "zod";

export type User = z.infer<typeof UserSchema>;
export type UserIdentity = z.infer<typeof UserIdentitySchema>;
export type Repo = z.infer<typeof RepoSchema>;
export type Issue = z.infer<typeof IssueSchema>;
export type Branch = z.infer<typeof BranchSchema>;
export type PullRequest = z.infer<typeof PullRequestSchema>;
export type Commit = z.infer<typeof CommitSchema>;
export type FileDiff = z.infer<typeof FileDiffSchema>;
export type Reaction = z.infer<typeof ReactionSchema>;
export type Comment = z.infer<typeof CommentSchema>;
export type PRMerge = z.infer<typeof PRMergeSchema>;
export type ReviewComment = z.infer<typeof ReviewCommentSchema>;
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;
export type Review = z.infer<typeof ReviewSchema>;
export type FileContent = z.infer<typeof FileContentSchema>;
export type IssueComment = z.infer<typeof IssueCommentSchema>;
export type CompareCommits = z.infer<typeof CompareCommitsSchema>;
export type CollaboratorPerms = z.infer<typeof CollaboratorPermsSchema>;

// Timeline sub-types
export type ReviewRequestEvent = z.infer<typeof ReviewRequestEventSchema>;
export type ReviewDismissedEvent = z.infer<typeof ReviewDismissedEventSchema>;
export type CommentEvent = z.infer<typeof CommentEventSchema>;
export type CommittedEvent = z.infer<typeof CommittedEventSchema>;
export type ReviewedEvent = z.infer<typeof ReviewedEventSchema>;
export type CommitCommentEvent = z.infer<typeof CommitCommentEventSchema>;
export type AssignIssueEvent = z.infer<typeof AssignIssueEventSchema>;
export type StateChangeEvent = z.infer<typeof StateChangeEventSchema>;

const issueState = ["open", "closed"] as const;
const side = ["LEFT", "RIGHT"] as const;
const subjectType = ["line", "file"] as const;
const authorAssociation = [
  "COLLABORATOR",
  "CONTRIBUTOR",
  "FIRST_TIMER",
  "FIRST_TIME_CONTRIBUTOR",
  "MANNEQUIN",
  "MEMBER",
  "NONE",
  "OWNER",
] as const;
const repoVisibility = ["public", "private", "internal"] as const;
const fileDiffStatus = [
  "added",
  "removed",
  "modified",
  "renamed",
  "copied",
  "changed",
  "unchanged",
] as const;
const compareCommitsStatus = [
  "diverged",
  "ahead",
  "behind",
  "identical",
] as const;

export const UserSchema = z.object({
  login: z.string(),
  id: z.number(),
  avatar_url: z.string(),
  permissions: z
    .object({
      pull: z.boolean(),
      push: z.boolean(),
      admin: z.boolean(),
      triage: z.boolean().optional(),
      maintain: z.boolean().optional(),
    })
    .optional(),
});

export const UserIdentitySchema = z.object({
  date: z.string(),
  email: z.string(),
  name: z.string(),
});

export const RepoSchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  owner: UserSchema,
  html_url: z.string(),
  description: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  pushed_at: z.string(),
  stargazers_count: z.number(),
  watchers_count: z.number(),
  open_issues_count: z.number(),
  has_pull_requests: z.boolean(),
  visibility: z.enum(repoVisibility),
});

export const BranchSchema = z.object({
  label: z.string(),
  ref: z.string(),
  sha: z.string(),
  user: UserSchema,
  repo: RepoSchema,
});

// optional fields are not included in either list or search endpoints
export const PullRequestSchema = z.object({
  url: z.string(),
  id: z.number(),
  html_url: z.string(),
  repository_url: z.string().optional(),
  repository_name: z.string().optional(),
  repository_owner: z.string().optional(),
  diff_url: z.string().optional(),
  number: z.number(),
  state: z.enum(issueState),
  locked: z.boolean(),
  title: z.string(),
  user: UserSchema.nullable(),
  body: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  closed_at: z.string().nullable(),
  merged_at: z.string().nullish(),
  merge_commit_sha: z.string().nullish(),
  assignees: z.array(UserSchema).nullable(),
  requested_reviewers: z.array(UserSchema).nullish(),
  head: BranchSchema.optional(),
  base: BranchSchema.optional(),
  author_association: z.enum(authorAssociation),
  draft: z.boolean(),
  assignee: UserSchema.nullable(),
  merged: z.boolean().optional(),
  mergeable: z.boolean().nullable().optional(),
  rebaseable: z.boolean().nullable().optional(),
  mergeable_state: z.string().optional(),
  merged_by: UserSchema.nullable().optional(),
  comments: z.number().optional(),
  review_comments: z.number().optional(),
  commits: z.number().optional(),
  additions: z.number().optional(),
  deletions: z.number().optional(),
  changed_files: z.number().optional(),
  pull_request: z
    .object({
      merged_at: z.string().nullable(),
    })
    .optional(),
});

// Not in use
export const IssueSchema = z.object({
  url: z.string(),
  id: z.number(),
  number: z.number(),
  state: z.enum(issueState),
  title: z.string(),
  user: UserSchema.nullable(),
  body: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  assignees: z.array(UserSchema).nullable(),
  locked: z.boolean(),
  repository: RepoSchema,
  pull_request: PullRequestSchema,
});

export const FileDiffSchema = z.object({
  sha: z.string().nullable(),
  filename: z.string(),
  status: z.enum(fileDiffStatus),
  additions: z.number(),
  deletions: z.number(),
  changes: z.number(),
  contents_url: z.string(),
  patch: z.string().optional(),
  previous_filename: z.string().optional(),
});

export const ReactionSchema = z.object({
  total_count: z.number(),
  "+1": z.number(),
  "-1": z.number(),
  laugh: z.number(),
  hooray: z.number(),
  confused: z.number(),
  heart: z.number(),
  rocket: z.number(),
  eyes: z.number(),
});

export const CommentSchema = z.object({
  pull_request_review_id: z.number(),
  id: z.number(),
  diff_hunk: z.string(),
  path: z.string(),
  commit_id: z.string(),
  original_commit_id: z.string(),
  user: UserSchema,
  body: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  reactions: ReactionSchema,
  start_line: z.number().nullable(),
  original_start_line: z.number().nullable(),
  start_side: z.enum(side).nullable(),
  line: z.number().nullable(),
  original_line: z.number().nullable(),
  side: z.enum(side),
  in_reply_to_id: z.number().nullish(),
  author_association: z.enum(authorAssociation),
  subject_type: z.enum(subjectType),
});

export const PRMergeSchema = z.object({
  sha: z.string(),
  merged: z.boolean(),
  message: z.string(),
});

export const ReviewCommentSchema = z.object({
  pull_request_review_id: z.number(),
  id: z.number(),
  diff_hunk: z.string(),
  path: z.string(),
  commit_id: z.string(),
  original_commit_id: z.string(),
  user: UserSchema,
  body: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  reactions: ReactionSchema,
  in_reply_to_id: z.number().nullish(),
  author_association: z.enum(authorAssociation),
  subject_type: z.enum(subjectType).nullish(),
});

export const ReviewSchema = z.object({
  id: z.number(),
  user: UserSchema.nullable(),
  body: z.string(),
  html_url: z.string(),
  state: z.string(),
  submitted_at: z.string().optional(),
  author_association: z.enum(authorAssociation),
});

export const CommitSchema = z.object({
  url: z.string(),
  sha: z.string(),
  html_url: z.string(),
  commit: z.object({
    message: z.string(),
    author: UserIdentitySchema,
    committer: UserIdentitySchema,
  }),
  author: UserSchema.nullable(),
  committer: UserSchema.nullable(),
  stats: z
    .object({
      additions: z.number(),
      deletions: z.number(),
      total: z.number(),
    })
    .optional(),
  files: z.array(FileDiffSchema).optional(),
});

export const CommitCommentSchema = z.object({
  id: z.number(),
  body: z.string(),
  path: z.string().nullable(),
  line: z.number().nullable(),
  commit_id: z.string(),
  user: UserSchema,
  created_at: z.string(),
  updated_at: z.string(),
  author_association: z.enum(authorAssociation),
  reactions: ReactionSchema,
});

export const ReviewRequestEventSchema = z.object({
  id: z.number(),
  url: z.string(),
  actor: UserSchema,
  event: z.enum(["review_requested", "review_request_removed"]),
  created_at: z.string(),
  review_requester: UserSchema,
  requested_reviewer: UserSchema,
});

export const ReviewDismissedEventSchema = z.object({
  id: z.number(),
  url: z.string(),
  actor: UserSchema,
  event: z.literal("review_dismissed"),
  created_at: z.string(),
  dismissed_review: z.object({
    state: z.string(),
    review_id: z.number(),
    dismissal_message: z.string().nullable(),
    dismissal_commit_id: z.string().optional(),
  }),
});

export const CommentEventSchema = z.object({
  id: z.number(),
  url: z.string(),
  actor: UserSchema,
  event: z.enum(["commented", "comment_deleted"]),
  created_at: z.string(),
  updated_at: z.string(),
  body: z.string(),
  user: UserSchema,
  author_association: z.enum(authorAssociation),
  reactions: ReactionSchema,
});

export const CommittedEventSchema = z.object({
  event: z.literal("committed"),
  sha: z.string(),
  url: z.string(),
  author: UserIdentitySchema,
  committer: UserIdentitySchema,
  message: z.string(),
});

export const LineCommentEventSchema = z.object({
  event: z.literal("commented"),
  comments: z.array(CommentSchema),
});

export const ReviewedEventSchema = z.object({
  id: z.number(),
  event: z.literal("reviewed"),
  user: UserSchema,
  body: z.string().nullable(),
  state: z.string(),
  submitted_at: z.string(),
  updated_at: z.string(),
  author_association: z.enum(authorAssociation),
  comments: z.array(ReviewCommentSchema).optional(),
});

export const CommitCommentEventSchema = z.object({
  event: z.literal("commented"),
  commit_id: z.number(),
  comments: z.array(CommitCommentSchema),
});

export const AssignIssueEventSchema = z.object({
  id: z.number(),
  url: z.string(),
  actor: UserSchema,
  event: z.enum(["assigned", "unassigned"]),
  created_at: z.string(),
  assignee: UserSchema,
});

export const StateChangeEventSchema = z.object({
  id: z.number(),
  url: z.string(),
  actor: UserSchema,
  event: z.enum(["closed", "merged", "reopened"]),
  created_at: z.string(),
  state_reason: z.string().nullish(),
});

export const TimelineEventSchema = z
  .union([
    ReviewRequestEventSchema, // event: review_requested, review_request_removed
    ReviewDismissedEventSchema, // event: review_dismissed
    CommentEventSchema, // event: commented, comment_deleted
    CommittedEventSchema, // event: committed
    ReviewedEventSchema, // event: reviewed
    AssignIssueEventSchema, // event: assigned, unassigned
    StateChangeEventSchema, // event: closed, merged, reopened
  ])
  .nullable();

export const FileContentSchema = z.object({
  type: z.literal("file"),
  encoding: z.string(),
  size: z.number(),
  name: z.string(),
  path: z.string(),
  content: z.string(),
  sha: z.string(),
  url: z.url(),
  git_url: z.url().nullable().optional(),
  html_url: z.url().nullable().optional(),
  download_url: z.string().url().nullable().optional(),
  _links: z
    .object({
      git: z.url().nullable().optional(),
      self: z.url(),
      html: z.url().nullable().optional(),
    })
    .optional(),
});

export const GitHubFileContentSchema = z.object({
  type: z.string(),
  encoding: z.string().optional(),
  size: z.number(),
  name: z.string(),
  path: z.string(),
  content: z.string().optional(),
  sha: z.string(),
  url: z.string(),
  git_url: z.string().nullable(),
  html_url: z.string().nullable(),
  download_url: z.string().nullable(),
  _links: z.object({
    git: z.string().nullable(),
    self: z.string(),
    html: z.string().nullable(),
  }),
});

export const GitHubFileDataSchema = z.union([
  GitHubFileContentSchema,
  z.array(GitHubFileContentSchema),
]);
export const IssueCommentSchema = z.object({
  id: z.number(),
  body: z.string().optional(),
  user: UserSchema,
  created_at: z.string(),
  updated_at: z.string(),
  author_association: z.enum(authorAssociation).optional(),
  reactions: ReactionSchema.optional(),
});

export const CompareCommitsSchema = z.object({
  base_commit: CommitSchema,
  merge_base_commit: CommitSchema,
  html_url: z.string(),
  status: z.enum(compareCommitsStatus),
  ahead_by: z.number(),
  behind_by: z.number(),
  total_commits: z.number(),
  files: z.array(FileDiffSchema),
});

export const CollaboratorPermsSchema = z.object({
  permission: z.string(),
  role_name: z.string(),
  user: UserSchema.nullable(),
});
