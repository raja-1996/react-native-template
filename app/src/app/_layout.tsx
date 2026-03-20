import { QueryClientProvider } from "@tanstack/react-query";
import { Slot } from "expo-router";
import React, { useEffect } from "react";

import { queryClient } from "@/lib/query-client";
import { useAuthStore } from "@/stores/auth-store";

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <QueryClientProvider client={queryClient}>
      <Slot />
    </QueryClientProvider>
  );
}
