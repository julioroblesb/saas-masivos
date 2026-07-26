'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            gcTime: 10 * 60 * 1000,
            refetchOnReconnect: true,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              const status =
                typeof error === 'object' && error !== null && 'status' in error
                  ? Number(error.status)
                  : 0;
              return status >= 400 && status < 500 ? false : failureCount < 2;
            },
            staleTime: 60 * 1000,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
