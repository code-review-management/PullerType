import * as z from "zod";

export type GitHubContent = z.infer<typeof GitHubContentSchema>;
export type FileChange = z.infer<typeof FileChangeSchema>;
export type CompareResponse = z.infer<typeof CompareResponseSchema>;
export type CompareWithRateLimit = z.infer<typeof CompareWithRateLimitSchema>;
export type MergeFileOutput = z.infer<typeof MergeFileOutputSchema>;
export type MergeOutput = z.infer<typeof MergeOutputSchema>;
export type MergeCommitInputData = z.infer<typeof MergeCommitInputDataSchema>;
export type MergeCommitContent = z.infer<typeof MergeCommitContentSchema>;
export type MergeCommitPayloadSchema = z.infer<typeof MergeCommitPayloadSchema>;
export type TargetFeatureParams = z.infer<typeof TargetFeatureParamsSchema>;

export const TargetFeatureParamsSchema = z.object({
  target_branch: z.string().min(1, "target_branch is required"),
  feature_branch: z.string().min(1, "feature_branch is required"),
});

export const MergeCommitInputDataSchema = z.object({
  owner: z.string().min(1, "Owner is required"),
  repo: z.string().min(1, "Repo is required"),
  targetMergeSha: z.string().min(1, "SHA is required"),
  targetBranch: z.string().min(1, "Target branch is required"),
  featureBranch: z.string().min(1, "Feature branch is required"),
});

export const MergeCommitContentSchema = z.object({
  filename: z.string().min(1, "Filename is required"),
  content: z.string(), // Content can be an empty string
});

export const MergeCommitPayloadSchema = z.object({
  mergeCommitData: MergeCommitInputDataSchema,
  mergeContent: z.array(MergeCommitContentSchema),
});

export const MergeFileOutputSchema = z.object({
  filename: z.string(),
  hasConflict: z.boolean(),
  contents: z.string(),
});

export const MergeOutputSchema = z.object({
  targetShaAtMerge: z.string(),
  mergedFiles: z.array(MergeFileOutputSchema),
});

export const GitHubContentSchema = z.object({
  type: z.string(),
  encoding: z.string(),
  size: z.number(),
  name: z.string(),
  path: z.string(),
  content: z.string().optional(),
  sha: z.string(),
  url: z.string(),
  git_url: z.string().nullable(),
  html_url: z.string().nullable(),
  download_url: z.string().nullable(),
});

export const FileChangeSchema = z.object({
  filename: z.string(),
  status: z.enum([
    "added",
    "removed",
    "modified",
    "renamed",
    "copied",
    "changed",
    "unchanged",
  ]),
});

export const CompareResponseSchema = z.object({
  merge_base_commit: z.object({
    sha: z.string(),
  }),
  base_commit: z.object({
    sha: z.string(),
  }),
  files: z.array(FileChangeSchema),
});

export const CompareWithRateLimitSchema = z.object({
  data: CompareResponseSchema,
  rateLimit: z.object({
    remaining: z.coerce.number(),
    reset: z.coerce.number(),
    limit: z.coerce.number(),
  }),
});
