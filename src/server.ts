// SSR shim: leaflet / @react-leaflet/core touch `window`, `document`, and
// `navigator` at module top-level. They don't render on the server (map is
// gated behind a `mounted` flag), but importing the module must not crash.
// Inline here so Vite doesn't tree-shake a side-effect-only import.
{
  const g = globalThis as unknown as Record<string, unknown>;
  if (typeof g.window === "undefined") {
    const noop = () => {};
    const win: Record<string, unknown> = {
      setTimeout: (fn: () => void, ms?: number) => setTimeout(fn, ms),
      clearTimeout: (id: unknown) => clearTimeout(id as number),
      setInterval: (fn: () => void, ms?: number) => setInterval(fn, ms),
      clearInterval: (id: unknown) => clearInterval(id as number),
      requestAnimationFrame: (fn: () => void) => setTimeout(fn, 16) as unknown as number,
      cancelAnimationFrame: (id: unknown) => clearTimeout(id as number),
      addEventListener: noop,
      removeEventListener: noop,
      location: { href: "", hostname: "", pathname: "/", search: "", hash: "" },
      navigator: { userAgent: "", platform: "" },
    };
    g.window = win;
  }
  if (typeof g.document === "undefined") {
    const noop = () => {};
    const doc = {
      createElement: () => ({ style: {}, setAttribute: noop, appendChild: noop }),
      createElementNS: () => ({ style: {}, setAttribute: noop, appendChild: noop }),
      documentElement: { style: {}, className: "" },
      body: { appendChild: noop, removeChild: noop },
      addEventListener: noop,
      removeEventListener: noop,
      getElementsByTagName: () => [],
    };
    g.document = doc;
    (g.window as Record<string, unknown>).document = doc;
  }
  if (typeof g.navigator === "undefined") {
    const nav = { userAgent: "", platform: "" };
    g.navigator = nav;
    (g.window as Record<string, unknown>).navigator = nav;
  }
}

import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
