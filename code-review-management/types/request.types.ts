import * as z from "zod";
import { CommentSchema } from "./github.types";

export type CommentCreateRequest = z.infer<typeof CommentCreateRequestSchema>;
export type CommentPatchRequest = z.infer<typeof CommentPatchRequestSchema>;
export type CommentDeleteRequest = z.infer<typeof CommentDeleteRequestSchema>;
export type PRMergeRequest = z.infer<typeof PRMergeRequestSchema>;
export type CreateReviewRequest = z.infer<typeof CreateReviewRequestSchema>;
export type ThreadSuggestionRequest = z.infer<
  typeof ThreadSuggestionRequestSchema
>;
export type CodeEditResponse = z.infer<typeof CodeEditResponseSchema>;
export type SuggestionCommentUpdateRequest = z.infer<
  typeof SuggestionCommentUpdateRequestSchema
>;
export type SuggestionCommitRequest = z.infer<
  typeof SuggestionCommitRequestShema
>;
export type CreateIssueCommentRequest = z.infer<
  typeof CreateIssueCommentRequestSchema
>;
export type ReviewersRequest = z.infer<typeof ReviewersRequestSchema>;

const side = ["LEFT", "RIGHT"] as const;
const mergeMethod = ["merge", "squash", "rebase"] as const;
const reviewEvent = ["APPROVE", "REQUEST_CHANGES", "COMMENT"] as const;
const subjectType = ["line", "file"] as const;

export const CommentCreateRequestSchema = z
  .object({
    body: z.string(),
    commit_id: z.string(),
    path: z.string(),
    side: z.enum(side).optional(),
    line: z.number().optional(),
    start_line: z.number().optional(),
    start_side: z.enum(side).optional(),
    in_reply_to: z.number().optional(),
    subject_type: z.enum(subjectType).optional(),
  })
  .refine(
    (data) =>
      (data.side != null &&
        data.line != null &&
        data.start_line != null &&
        data.start_side != null &&
        data.in_reply_to == null &&
        data.subject_type == "line") ||
      (data.side == null &&
        data.line == null &&
        data.start_line == null &&
        data.start_side == null &&
        (data.in_reply_to != null || data.subject_type == "file")),
    {
      message:
        "Must provide either comment location information OR an in reply to ID. Do not provide comment location information if subject type is file.",
    },
  );

export const CommentPatchRequestSchema = z.object({
  comment_id: z.number(),
  body: z.string().nonempty(),
});

export const CommentDeleteRequestSchema = z.object({
  comment_id: z.number(),
});

export const PRMergeRequestSchema = z.object({
  commit_title: z.string(),
  commit_message: z.string(),
  sha: z.string().optional(),
  merge_method: z.enum(mergeMethod),
});

export const CreateReviewRequestSchema = z
  .object({
    body: z.string().optional(),
    event: z.enum(reviewEvent),
  })
  .refine(
    (data) => {
      if (data.event == "REQUEST_CHANGES" || data.event == "COMMENT") {
        return data.body;
      }
      return true;
    },
    {
      message: "Must provide body if event is REQUEST_CHANGES or COMMENT",
    },
  );

export const ThreadSuggestionRequestSchema = z.object({
  id: z.number(),
  filePath: z.string(),
  side: z.enum(side),
  line: z.number(),
  sha: z.string(),
  comments: z.array(CommentSchema),
});

const DeleteRangeSchema = z.object({
  minInclusiveLine: z.number(),
  maxExclusiveLine: z.number(),
});

const AdditionBlockSchema = z.object({
  insertionCode: z.string(),
});

export const CodeEditResponseSchema = z.object({
  deleteRange: DeleteRangeSchema,
  additionBlock: AdditionBlockSchema,
});

export const FileNameParamsSchema = z
  .string()
  .trim()
  .min(1, "Path cannot be empty")
  .refine((path) => !path.includes(".."), {
    message: "Directory traversal is not allowed",
  })
  .refine((path) => !path.startsWith("/"), {
    message: "Path must be relative (do not start with a slash)",
  });

export const SuggestionCommentUpdateRequestSchema = z.object({
  githubCommentId: z.number(),
  deletionContent: z.string(),
  additionContent: z.string(),
  relativeLineLocation: z.number(),
});

export const SuggestionCommitRequestShema = z.object({
  filename: z.string(),
  content: z.string(),
  suggestionData: SuggestionCommentUpdateRequestSchema,
});
export const CreateIssueCommentRequestSchema = z.object({
  body: z.string(),
});

export const ReviewersRequestSchema = z.object({
  reviewers: z.array(z.string()),
});
