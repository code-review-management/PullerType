"use client";

import { AppProgressProvider as ProgressProvider } from "@bprogress/next";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: process.env.NODE_ENV === "production",
      retry: (failureCount, error) => {
        if (error.status < 500) return false;
        return process.env.NODE_ENV === "production" && failureCount < 3;
      },
    },
  },
});

/**
 * Providers to wrap around the application's root layout. Includes TanStack
 * Query client provider.
 *
 * Docs:
 * 1. https://tanstack.com/query/latest/docs/framework/react/examples/simple?panel=code
 *
 * @param children: The children of the root layout.
 */
export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ProgressProvider
      height="2.5px"
      color="var(--loading-bar-color)"
      options={{ showSpinner: false }}
    >
      <SessionProvider>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </SessionProvider>
    </ProgressProvider>
  );
}
