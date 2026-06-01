import { Comment, CommentSchema } from "@/types/github.types";
import {
  CodeEditResponse,
  SuggestionCommentUpdateRequest,
  ThreadSuggestionRequest,
} from "@/types/request.types";
import { Octokit } from "octokit";

export async function commentGeminiSuggestion(
  octokit: Octokit,
  owner: string,
  repo: string,
  pull_number: number,
  suggestion: CodeEditResponse,
  fileContext: string,
  thread: ThreadSuggestionRequest,
) {
  const fileLines: string[] = fileContext.split("\n");
  const { deleteRange, additionBlock } = suggestion;
  let deletionBlock = "";

  for (
    let i = deleteRange.minInclusiveLine;
    i < deleteRange.maxExclusiveLine;
    i++
  ) {
    deletionBlock += fileLines[i - 1] + "\n";
  }

  const relativeDiff = deleteRange.minInclusiveLine - thread.line;
  const tag = `<!--[Gemini Suggestion#HLTP][${relativeDiff}]-->`;
  const { insertionCode } = additionBlock;
  const body = convertIntoMarkdownSuggestion(tag, deletionBlock, insertionCode);

  try {
    await octokit.rest.pulls.createReplyForReviewComment({
      owner,
      repo,
      pull_number,
      comment_id: thread.id,
      body,
    });
  } catch (error) {
    console.error("Failed to reply to review comment:", error);
  }
}

function convertIntoMarkdownSuggestion(
  tag: string,
  deletionBlock: string,
  insertionBlock: string,
  taken: boolean = false,
): string {
  const header: string =
    "Gemini Suggestion (" + (taken ? "Committed" : "AI can make mistakes") + ")";
  const formatDiffLines = (text: string, prefix: string): string => {
    return text
      .trimEnd()
      .split("\n")
      .map((line) => `${prefix} ${line}`)
      .join("\n");
  };

  const formattedDeletions = formatDiffLines(deletionBlock, "-");
  const formattedInsertions = formatDiffLines(insertionBlock, "+");

  return `### ${header}
${tag}
<!--Gemini-Tag [Code To Be Deleted]-->
\`\`\`diff
${formattedDeletions}
\`\`\`
<!--Gemini-Tag [Code To Be Inserted]-->
\`\`\`diff
${formattedInsertions}
\`\`\`
<!--Gemini-Tag [Diff End] -->
`;
}

export async function updateGeminiComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  suggestionData: SuggestionCommentUpdateRequest,
  taken?: boolean,
): Promise<Comment | null> {
  const {
    githubCommentId,
    deletionContent,
    additionContent,
    relativeLineLocation,
  } = suggestionData;
  if (!taken) taken = false;
  const takenTag = taken ? "[Commited]" : "";
  const tag = `<!--[Gemini Suggestion#HLTP][${relativeLineLocation}]${takenTag}-->`;
  const body = convertIntoMarkdownSuggestion(
    tag,
    deletionContent,
    additionContent,
    taken,
  );

  try {
    const { data: contents } = await octokit.rest.pulls.updateReviewComment({
      owner: owner,
      repo: repo,
      comment_id: githubCommentId,
      body: body,
    });

    const filteredResponse: Comment = CommentSchema.parse(contents);
    return filteredResponse;
  } catch (error) {
    console.log("Error occured when updating gemini suggestion: " + error);
    return null;
  }
}
