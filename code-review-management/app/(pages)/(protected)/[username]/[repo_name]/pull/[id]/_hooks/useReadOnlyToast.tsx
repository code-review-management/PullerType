import { useEffect } from "react";
import { usePermissionChecks } from "./usePermissionChecks";
import ReadOnlyToast from "@components/ReadOnlyToast/ReadOnlyToast";
import toast from "react-hot-toast";

export function useReadOnlyToast() {
  const { accessType } = usePermissionChecks();

  useEffect(() => {
    if (accessType === "implicit-read") {
      toast(<ReadOnlyToast />, {
        duration: Infinity,
        id: "read-only-mode",
      });
    }

    return () => toast.dismiss("read-only-mode");
  }, [accessType]);
}
