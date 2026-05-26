import { usePermissionContext } from "../_contexts/PermissionContext";

type AccessType = "implicit-read" | "explicit-read" | "write";

export function usePermissionChecks() {
  const { data, isPending } = usePermissionContext();
  let accessType: AccessType | null = null;

  if (
    // Note: Data is only returned for users with write-access to the repo.
    data?.user?.permissions?.push ||
    data?.permission === "write" ||
    data?.permission === "admin"
  ) {
    accessType = "write";
  } else if (!isPending) {
    // Only assign fallback after request finishes pending so toast message does
    // not temporarily show for repos with write access.
    accessType = "implicit-read";
  }

  return {
    accessType,
    // Separate `hasCommentPermission` from `hasWritePermission` in case we are
    // able to find a way to differentiate missing GitHub App installation from
    // read-only access in the API response. If so, "explicit-read" should also
    // be allowed to comment.
    hasCommentPermission: accessType === "write",
    hasWritePermission: accessType === "write",
  };
}
