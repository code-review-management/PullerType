import { Review, User } from "@/types/github.types";

export function createExampleReview(
  user: User,
  id: number,
  state:
    | "APPROVED"
    | "CHANGES_REQUESTED"
    | "COMMENTED"
    | "DISMISSED" = "APPROVED",
): Review {
  return {
    id,
    user,
    body: "",
    html_url: "",
    state,
    author_association: "COLLABORATOR",
  };
}
