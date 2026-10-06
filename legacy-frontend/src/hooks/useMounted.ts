"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * Hook to safely detect client-side mounting without hydration mismatches or cascading re-renders.
 * Guaranteed to return `false` on the server and during client hydration, then `true` after mount.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
