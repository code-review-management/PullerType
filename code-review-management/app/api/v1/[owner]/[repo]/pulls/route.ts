/*
/api/v1/{owner}/{repo}/pulls

*NOT TO BE POLLED*

Endpoint is for listing all PR's under a repo and cannot be tagged with a last 
access time due to lack of ownership. ALL requests are redirected to GitHub.
*/

import { getCookieName } from "@/app/api/_utils/cookie-utils";
import { PullRequest, PullRequestSchema } from "@/types/github.types";
import { getToken } from "next-auth/jwt";
import { Octokit, RequestError } from "octokit";

type RouteContext = {
  params: Promise<{
    owner: string;
    repo: string;
  }>;
};

const secret = process.env.AUTH_SECRET;
const cookie = getCookieName();

export async function GET(req: Request, context: RouteContext) {
  const { owner, repo } = await context.params;
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

  // Validate required parameters
  if (!owner || !repo) {
    return Response.json(
      { error: "Missing required parameters" },
      { status: 400 },
    );
  }

  const octokit: Octokit = new Octokit({ auth: token.accessToken });

  try {
    const { data: contents } = await octokit.rest.pulls.list({
      owner: owner,
      repo: repo,
    });

    // Filter response
    const filteredResponse: PullRequest[] = contents.map((item) =>
      PullRequestSchema.parse(item),
    );

    return new Response(JSON.stringify(filteredResponse, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    if (error instanceof RequestError && error.status) {
      // Octokit Http error
      return new Response(error.message, { status: error.status });
    } else {
      // Parsing/other error
      return new Response("Server error", { status: 500 });
    }
  }
}
