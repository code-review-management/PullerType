/*
/api/v1/{owner}/{repo}/pulls/{pull_number}/requested_reviewers
*/

import { _get } from "./get";
import { _post } from "./post";
import { _delete } from "./delete";

type RouteContext = {
  params: Promise<{
    owner: string;
    repo: string;
    pull_number: string;
  }>;
};

export async function GET(req: Request, context: RouteContext) {
  const params = await context.params;
  return _get(req, params);
}

export async function POST(req: Request, context: RouteContext) {
  const params = await context.params;
  return _post(req, params);
}

export async function DELETE(req: Request, context: RouteContext) {
  const params = await context.params;
  return _delete(req, params);
}
