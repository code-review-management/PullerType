"use client";

import { ReactNode } from "react";
import { useReadOnlyToast } from "./_hooks/useReadOnlyToast";
import PermissionContextProvider from "./_contexts/PermissionContext";
import MergeContextProvider from "./_contexts/MergeContext";
import ReviewContextProvider from "./_contexts/ReviewContext";

export default function PullLayout({ children }: { children: ReactNode }) {
  return (
    <PermissionContextProvider>
      <ReadOnlyToast />
      <MergeContextProvider>
        <ReviewContextProvider>{children}</ReviewContextProvider>
      </MergeContextProvider>
    </PermissionContextProvider>
  );
}

function ReadOnlyToast() {
  useReadOnlyToast();
  return null;
}
