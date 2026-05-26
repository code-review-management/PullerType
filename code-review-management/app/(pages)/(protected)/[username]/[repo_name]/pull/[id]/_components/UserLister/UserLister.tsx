import Image from "next/image";
import styles from "./UserLister.module.css";
import UserIcon from "@/app/(pages)/_components/UserIcon/UserIcon";
import Subheader from "../Subheader/Subheader";
import { getListedUserIcon, listedUser } from "../../_utils/userlist-utils";
import { usePermissionChecks } from "../../_hooks/usePermissionChecks";

export type UserListType = "reviewers" | "assignees";

/**
 * The icon displayed for the state of a review. For assignees, this will not display anything
 * because there is no icon src for state `ASSIGNED`.
 *
 * @param listedUser The `listedUser` object this icon will be used to represent state for.
 * @returns
 */
function UserListerStateIcon({ listedUser }: { listedUser: listedUser }) {
  const iconProps = getListedUserIcon(listedUser);
  if (!iconProps || !iconProps.src) return;

  const { src, size, tooltip } = iconProps;

  return (
    <div
      className={styles.iconWrapper}
      {...(tooltip && {
        "data-tooltip-id": "userlister-icon",
        "data-tooltip-content": tooltip,
        "data-tooltip-place": "top-end",
        "data-tooltip-delay-show": 100,
      })}
    >
      <Image src={src} alt={src} width={size} height={size} />
    </div>
  );
}

/**
 * A row of the user list in the UserLister representing 1 user in the list.
 *
 * @param listedUser `listedUser` object this row represents.
 */
function UserListerRow({ listedUser }: { listedUser: listedUser }) {
  const { login, avatar_url } = listedUser.user;

  return (
    <div className={styles.userListerRow}>
      <div className={styles.userListerUser}>
        <UserIcon avatarUrl={avatar_url} username={login} size={25} />
        <h5 className={styles.username}>{login}</h5>
      </div>
      <UserListerStateIcon listedUser={listedUser} />
    </div>
  );
}

/**
 * A section of the PR view page where users can be dynamically added and the current list is displayed.
 * Used for the reviewers and assignees section of the PR view page.
 *
 * @param listType "reviewers" or "assignees"
 * @param userList An array of `listedUser` objects.
 * TODO: Add "add" functionality
 */
export default function UserLister({
  listType,
  userList,
  editable,
}: {
  listType: UserListType;
  userList: listedUser[];
  editable: boolean;
}) {
  const { hasWritePermission } = usePermissionChecks();
  const headerDisplay = `${listType[0].toUpperCase()}${listType.slice(1)}`;

  return (
    <div className={styles.userLister}>
      <div className={styles.headerRow}>
        <Subheader>{headerDisplay}</Subheader>
        {hasWritePermission && editable && (
          <div className={styles.iconWrapper}>
            <Image
              className={styles.plusIcon}
              src="/icons/plus.svg"
              alt="Plus icon"
              height={12}
              width={12}
            />
          </div>
        )}
      </div>
      <div className={styles.listedUsers}>
        {userList.map((listedUser) => (
          <UserListerRow listedUser={listedUser} key={listedUser.user.login} />
        ))}
      </div>
    </div>
  );
}
