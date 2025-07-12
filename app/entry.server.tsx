import { PassThrough } from 'node:stream';

import { createReadableStreamFromReadable } from '@react-router/node';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { isbot } from 'isbot';
import React from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import type { EntryContext } from 'react-router';
import { ServerRouter } from 'react-router';

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  entryContext: EntryContext
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  });

  return isbot(request.headers.get('user-agent') || '')
    ? handleBotRequest(
        request,
        responseStatusCode,
        responseHeaders,
        entryContext,
        queryClient
      )
    : handleBrowserRequest(
        request,
        responseStatusCode,
        responseHeaders,
        entryContext,
        queryClient
      );
}

function createRenderStream(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  entryContext: EntryContext,
  queryClient: QueryClient,
  readyEventName: 'onAllReady' | 'onShellReady'
) {
  return new Promise((resolve, reject) => {
    const handleReady = () => {
      const body = new PassThrough();
      const stream = createReadableStreamFromReadable(body);

      responseHeaders.set('Content-Type', 'text/html');

      resolve(
        new Response(stream, {
          headers: responseHeaders,
          status: responseStatusCode,
        })
      );

      pipe(body);
    };

    const streamOptions = {
      onShellError(error: unknown) {
        reject(error);
      },
      onError(_error: unknown) {
        responseStatusCode = 500;
        // Error handling logic removed for cleaner code
      },
      ...(readyEventName === 'onAllReady'
        ? { onAllReady: handleReady }
        : { onShellReady: handleReady }),
    };

    const { pipe, abort } = renderToPipeableStream(
      <QueryClientProvider client={queryClient}>
        <ServerRouter context={entryContext} url={request.url} />
      </QueryClientProvider>,
      streamOptions
    );

    setTimeout(abort, 5000);
  });
}

function handleBotRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  entryContext: EntryContext,
  queryClient: QueryClient
) {
  return createRenderStream(
    request,
    responseStatusCode,
    responseHeaders,
    entryContext,
    queryClient,
    'onAllReady'
  );
}

function handleBrowserRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  entryContext: EntryContext,
  queryClient: QueryClient
) {
  return createRenderStream(
    request,
    responseStatusCode,
    responseHeaders,
    entryContext,
    queryClient,
    'onShellReady'
  );
}
