/*
/api/v1/repos
*/

import { Repo, RepoSchema } from "@/types/github.types";
import { getToken } from "next-auth/jwt";
import { Octokit, RequestError } from "octokit";

const secret = process.env.AUTH_SECRET;
const cookieKey =
  process.env.NODE_ENV === "production"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

export async function GET(req: Request) {
  const token = await getToken({
    req: req,
    secret: secret,
    cookieName: cookieKey,
  });

  // Validate token
  if (token == null || token.accessToken == null || token.githubId == null) {
    console.log(`Unauthorized request at ${new Date()}`);
    return new Response(null, { status: 401 });
  }

  const octokit: Octokit = new Octokit({ auth: token.accessToken });

  try {
    const { data: contents } =
      await octokit.rest.repos.listForAuthenticatedUser();

    // Filter response
    const filteredResponse: Repo[] = contents.map((item) =>
      RepoSchema.parse(item),
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
      console.log(error);
      return new Response("Server error", { status: 500 });
    }
  }
}
