import { User } from "@/types/github.types";
import UserLister from "../UserLister/UserLister";
import { buildAssigneeList } from "../../_utils/userlist-utils";

/**
 * Assignees section of the PR view page.
 */
export default function Assignees({ assignees }: { assignees: User[] }) {
  const listedAssignees = buildAssigneeList(assignees);
  return (
    <UserLister
      listType={"assignees"}
      userList={listedAssignees}
      editable={false}
    />
  );
}
