/*
/api/v1/{owner}/{repo}/pulls/{pull_number}/conflicts/merge-conflict
*/

import { getMergeConflict } from "../_utils/merge-conflict-finder/get-merge";
import { getToken } from "next-auth/jwt";
import { Octokit } from "octokit";
import { AllowanceError } from "../_utils/merge-conflict-finder/detect-modified";
import { TargetFeatureParamsSchema } from "../_utils/merge-github.types";

type RouteContext = {
  params: Promise<{
    owner: string;
    repo: string;
    pull_number: string;
  }>;
};

const secret = process.env.AUTH_SECRET;
const cookieKey =
  process.env.NODE_ENV === "production"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

export async function GET(req: Request, context: RouteContext) {
  const { owner, repo } = await context.params;
  const token = await getToken({
    req: req,
    secret: secret,
    cookieName: cookieKey,
  });

  if (token == null || token.accessToken == null || token.githubId == null) {
    console.log("Unauthorized request at ${new Date()}");
    return new Response(null, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const queryObj = Object.fromEntries(searchParams.entries());
  const queryResult = TargetFeatureParamsSchema.safeParse(queryObj);

  if (!queryResult.success) {
    return Response.json(
      {
        error: "Invalid query parameters",
        details: queryResult.error.format(),
      },
      { status: 400 },
    );
  }
  const { target_branch, feature_branch } = queryResult.data;

  console.log("Received merge conflict request!");
  // Validate required parameters
  if (!owner || !repo || !target_branch || !feature_branch) {
    console.log("Missing params!");
    return Response.json(
      { error: "Missing required parameters" },
      { status: 406 },
    );
  }

  const octokit = new Octokit({ auth: token.accessToken });

  try {
    const mergeConflictResponse = await getMergeConflict(
      {
        owner: owner,
        repo: repo,
        targetBranch: target_branch,
        featureBranch: feature_branch,
      },
      octokit,
    );

    console.log("Sending back success!");
    return new Response(JSON.stringify(mergeConflictResponse, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error: unknown) {
    console.log("Error in merge conflict finder: " + error);

    if (error instanceof AllowanceError) {
      return new Response("Not enough tokens", { status: 403 });
    } else {
      return new Response("Server error", { status: 500 });
    }
  }
}
