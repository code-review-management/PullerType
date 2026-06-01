/*
/api/v1/{owner}/{repo}/pulls/{pull_number}/suggest/commit

*NOT TO BE POLLED*
*/

import { getCookieName } from "@/app/api/_utils/cookie-utils";
import { getToken } from "next-auth/jwt";
import { Octokit, RequestError } from "octokit";
import { SuggestionCommitRequestShema } from "@/types/request.types";
import { PullRequestSchema, GitHubFileDataSchema } from "@/types/github.types";
import { updateGeminiComment } from "@/lib/api/gemini/geminiCommentor";

type RouteContext = {
  params: Promise<{
    owner: string;
    repo: string;
    pull_number: string;
  }>;
};

const secret = process.env.AUTH_SECRET;
const cookie = getCookieName();

export async function POST(req: Request, context: RouteContext) {
  const token = await getToken({
    req: req,
    secret: secret,
    cookieName: cookie,
  });

  // Validate token
  if (token == null || token.accessToken == null || token.githubId == null) {
    console.log(`Unauthorized request at ${new Date()}`);
    return new Response(null, { status: 401 });
  }

  const { owner, repo, pull_number } = await context.params;
  const reqBody = await req.json();
  const reqArgs = SuggestionCommitRequestShema.safeParse(reqBody);

  // Validate required parameters
  if (!owner || !repo || !reqArgs.success) {
    return Response.json(
      { error: "Missing required parameters" },
      { status: 400 },
    );
  }

  try {
    const { filename, content, suggestionData } = reqArgs.data;
    const encodedContent = Buffer.from(content).toString("base64");

    const octokit = new Octokit({ auth: token.accessToken });
    const pullRequestResponse = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: Number(pull_number),
    });

    const pullRequest = PullRequestSchema.parse(pullRequestResponse.data);
    const branchName = pullRequest.head?.ref;
    const fileResponse = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: filename,
      ref: branchName,
    });

    const parsedFileData = GitHubFileDataSchema.parse(fileResponse.data);

    const fileSha = Array.isArray(parsedFileData)
      ? parsedFileData[0].sha
      : parsedFileData.sha;

    if (!fileSha) {
      return new Response("No SHA at PR head", { status: 400 });
    }

    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filename,
      message: "Committing suggestion",
      content: encodedContent,
      sha: fileSha,
      branch: branchName,
    })

    await updateGeminiComment(octokit, owner, repo, suggestionData, true);

    return new Response(JSON.stringify({ message: "Success" }), {
      status: 200,
    });
  } catch (error) {
    if (error instanceof RequestError && error.status) {
      return new Response(
        JSON.stringify({
          message: "Failed to apply suggestion",
          error: error instanceof Error ? error.message : "Unknown error"
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    } else {
      // Parsing/other error
      return new Response("Server error: " + error, { status: 500 });
    }
  }
}
