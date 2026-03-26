"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,          // 5 minutes (up from 1 min)
        gcTime: 30 * 60 * 1000,             // Keep unused cache for 30 min
        refetchOnWindowFocus: false,
        retry: 1,                            // Reduce retries (default 3)
        refetchOnReconnect: 'always',
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

