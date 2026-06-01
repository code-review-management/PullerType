/*
/api/v1/{owner}/{repo}/pulls/{pull_number}/single-file-content

*NOT TO BE POLLED*
*/

import { getCookieName } from "@/app/api/_utils/cookie-utils";
import { getToken } from "next-auth/jwt";
import { Octokit, RequestError } from "octokit";
import { FileNameParamsSchema } from "@/types/request.types";
import { PullRequestSchema, FileContentSchema } from "@/types/github.types";
import { treeifyError } from "zod";

type RouteContext = {
  params: Promise<{
    owner: string;
    repo: string;
    pull_number: string;
  }>;
};

const secret = process.env.AUTH_SECRET;
const cookie = getCookieName();

export async function GET(req: Request, context: RouteContext) {
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
  const { searchParams } = new URL(req.url);
  const rawPath = searchParams.get("path");
  const queryResult = FileNameParamsSchema.safeParse(rawPath);

  if (!queryResult.success) {
    return Response.json(
      {
        error: "Invalid query parameters",
        details: treeifyError(queryResult.error),
      },
      { status: 400 },
    );
  }
  const path = queryResult.data;

  if (!owner || !repo) {
    return Response.json(
      { error: "Missing required parameters" },
      { status: 400 },
    );
  }

  try {
    const castedPullNumber: number = Number(pull_number);
    const octokit = new Octokit({ auth: token.accessToken });
    const pullRequestResponse = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: castedPullNumber,
    });

    const pullRequest = PullRequestSchema.parse(pullRequestResponse.data);

    if (!pullRequest.head) {
      return new Response("No SHA at PR head", { status: 400 });
    }

    const headSha = pullRequest.head.sha;

    const contentResponse = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: headSha,
    });

    const fileContentData = FileContentSchema.parse(contentResponse.data);
    const content = Buffer.from(fileContentData.content, "base64").toString(
      "utf-8",
    );

    return new Response(JSON.stringify(content), {
      status: 200,
    });
  } catch (error) {
    if (error instanceof RequestError && error.status) {
      // Octokit Http error
      return new Response(error.message, { status: error.status });
    } else {
      // Parsing/other error
      return new Response("Server error: " + error, { status: 500 });
    }
  }
}
