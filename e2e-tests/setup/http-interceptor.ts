// Uses @mswjs/interceptors for request mocking rather than alternatives:
// - Playwright's page.route() has a bug with this setup
//   (https://github.com/microsoft/playwright/issues/30495)
// - MSW's service worker can't be registered on Obsidian's custom app:// origin

import { FetchInterceptor } from "@mswjs/interceptors/fetch";

interface MockRoute {
  status: number;
  body: unknown;
  capturedRequests: (Record<string, unknown> | null)[];
}

export class HttpMock {
  readonly unexpectedRequests: string[] = [];
  private readonly routes = new Map<string, MockRoute>();

  constructor() {
    const interceptor = new FetchInterceptor();

    // eslint-disable-next-line @typescript-eslint/no-misused-promises -- typing is out of date
    interceptor.on("request", async ({ request, controller }) => {
      const bodyText = await request.text();
      const response = this.handleRequest(
        request.method,
        request.url,
        bodyText,
      );

      if (response) {
        controller.respondWith(response);
      }
    });

    interceptor.apply();
  }

  register(method: string, url: string, status: number, body: unknown) {
    this.routes.set(this.key(method, url), {
      status,
      body,
      capturedRequests: [],
    });
  }

  requests(method: string, url: string) {
    return this.routes.get(this.key(method, url))?.capturedRequests ?? [];
  }

  private handleRequest(method: string, url: string, body: string) {
    const route = this.routes.get(this.key(method, url));

    if (!route) {
      if (/^https?:\/\//i.test(url)) {
        this.unexpectedRequests.push(`${method} ${url}`);
        return new Response("Unexpected request", { status: 500 });
      }
      // Let internal protocols (app://, file://, etc.) pass through
      return null;
    }

    route.capturedRequests.push(
      body ? (JSON.parse(body) as Record<string, unknown>) : null,
    );

    return new Response(JSON.stringify(route.body), {
      status: route.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  private key(method: string, url: string) {
    return `${method.toUpperCase()}:${url}`;
  }
}

globalThis.__httpMock = new HttpMock();
