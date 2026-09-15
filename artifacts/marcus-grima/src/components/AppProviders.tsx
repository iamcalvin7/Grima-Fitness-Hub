import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * The single React Query boundary for the application. This belongs outside
 * App so URL-entry guards (including the programme and exercise libraries)
 * cannot mount hooks before the provider exists.
 */
const queryClient = new QueryClient();

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}