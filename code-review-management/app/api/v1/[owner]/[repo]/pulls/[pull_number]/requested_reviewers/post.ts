/*
/api/v1/{owner}/{repo}/pulls/{pull_number}/requested_reviewers

Method: POST

*NOT TO BE POLLED*
*/

import { getCookieName } from "@/app/api/_utils/cookie-utils";
import { PullRequest, PullRequestSchema } from "@/types/github.types";
import { ReviewersRequestSchema } from "@/types/request.types";
import { getToken } from "next-auth/jwt";
import { Octokit, RequestError } from "octokit";

const secret = process.env.AUTH_SECRET;
const cookie = getCookieName();

export async function _post(
  req: Request,
  params: { owner: string; repo: string; pull_number: string },
) {
  const { owner, repo, pull_number } = params;
  const reqBody = await req.json();
  const reqArgs = ReviewersRequestSchema.safeParse(reqBody);
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
  if (!owner || !repo || !pull_number || !reqArgs.success) {
    return Response.json(
      { error: "Issue with required parameters" },
      { status: 400 },
    );
  }

  const { reviewers } = reqArgs.data;

  const octokit: Octokit = new Octokit({ auth: token.accessToken });

  try {
    const { data: contents } = await octokit.rest.pulls.requestReviewers({
      owner: owner,
      repo: repo,
      pull_number: Number(pull_number),
      reviewers: reviewers,
    });

    // Filter response
    const filteredResponse: PullRequest = PullRequestSchema.parse(contents);

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
      console.log(error);
      return new Response("Server error", { status: 500 });
    }
  }
}
