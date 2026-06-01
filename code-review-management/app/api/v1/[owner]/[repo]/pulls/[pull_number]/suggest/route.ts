/*
/api/v1/{owner}/{repo}/pulls/{pull_number}/suggest

*NOT TO BE POLLED*
*/

import { getCookieName } from "@/app/api/_utils/cookie-utils";
import { generateSuggestion } from "@/lib/api/gemini/geminiOrchestrator";
import { ThreadSuggestionRequestSchema } from "@/types/request.types";
import { getToken } from "next-auth/jwt";
import { Octokit, RequestError } from "octokit";

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
  const castedPullNumber: number = Number(pull_number);

  const reqBody = await req.json();
  const reqArgs = ThreadSuggestionRequestSchema.safeParse(reqBody);

  // Validate required parameters
  if (!owner || !repo || !castedPullNumber) {
    return Response.json(
      { error: "Missing required parameters" },
      { status: 400 },
    );
  }

  // Validate request parameters
  if (!reqArgs.success) {
    const error = JSON.parse(reqArgs.error.message);
    console.log(error);
    return Response.json({ error: error[0]["message"] }, { status: 400 });
  }

  try {
    const octokit = new Octokit({ auth: token.accessToken });
    await generateSuggestion(
      octokit,
      reqArgs.data,
      owner,
      repo,
      castedPullNumber,
    );

    return new Response(JSON.stringify({ message: "Success" }), {
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
