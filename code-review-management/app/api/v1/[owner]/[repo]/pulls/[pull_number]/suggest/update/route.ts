/*
/api/v1/{owner}/{repo}/pulls/{pull_number}/suggest/update

*NOT TO BE POLLED*
*/

import { getCookieName } from "@/app/api/_utils/cookie-utils";
import { updateGeminiComment } from "@/lib/api/gemini/geminiCommentor";
import { SuggestionCommentUpdateRequestSchema } from "@/types/request.types";
import { getToken } from "next-auth/jwt";
import { Octokit, RequestError } from "octokit";
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
  const reqArgs = SuggestionCommentUpdateRequestSchema.safeParse(reqBody);

  // Validate required parameters
  if (!owner || !repo || !pull_number) {
    return Response.json(
      { error: "Missing required parameters" },
      { status: 400 },
    );
  }

  // Validate request parameters
  if (!reqArgs.success) {
    return Response.json(
      {
        error: "Invalid query parameters",
        details: treeifyError(reqArgs.error),
      },
      { status: 400 },
    );
  }

  const suggestionUpdateData = reqArgs.data;

  const octokit = new Octokit({ auth: token.accessToken });

  try {
    const response = await updateGeminiComment(
      octokit,
      owner,
      repo,
      suggestionUpdateData,
    );
    if (response === null) {
      throw new Error("Error occured in update function, it returned null");
    }

    return new Response(JSON.stringify(response, null, 2), {
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
      return new Response("Server error: " + error, { status: 500 });
    }
  }
}
