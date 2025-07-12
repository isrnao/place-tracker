import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { StrictMode, startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { HydratedRouter } from 'react-router/dom';

declare global {
  interface Window {
    __REACT_QUERY_STATE__?: unknown;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
    },
  },
});

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <HydratedRouter />
      </QueryClientProvider>
    </StrictMode>
  );
});

// Clean up the global state
delete window.__REACT_QUERY_STATE__;
