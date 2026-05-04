import { expect, Page } from "@playwright/test";

export async function mockHttp(
  page: Page,
  method: string,
  url: string,
  status: number,
  body: unknown,
) {
  await page.evaluate(
    ({ method, url, status, body }) => {
      globalThis.__httpMock.register(method, url, status, body);
    },
    { method, url, status, body },
  );
}

export async function expectHttpRequest(
  page: Page,
  method: string,
  url: string,
  expected: Record<string, unknown>,
) {
  await expect
    .poll(() =>
      page.evaluate(
        ({ method, url }) => globalThis.__httpMock.requests(method, url),
        { method, url },
      ),
    )
    .toEqual(expect.arrayContaining([expect.objectContaining(expected)]));
}

export async function expectNoUnexpectedRequests(page: Page) {
  const unexpected = await page.evaluate(
    () => globalThis.__httpMock.unexpectedRequests,
  );

  expect(
    unexpected,
    `Unexpected network requests:\n${unexpected.join("\n")}`,
  ).toHaveLength(0);
}
