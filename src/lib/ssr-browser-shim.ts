// SSR shim for libraries (leaflet, @react-leaflet/core) that touch `window`,
// `document`, or `navigator` at module top-level. They don't actually run
// during SSR because our map components gate rendering behind a `mounted`
// flag, but their module init reads a handful of globals eagerly. Stub the
// bare minimum so importing the module doesn't crash the worker.

type Mutable = Record<string, unknown>;
const g = globalThis as unknown as Mutable;

if (typeof g.window === "undefined") {
  const noop = () => {};
  const win: Mutable = {
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
    document: undefined,
  };
  g.window = win;
}

if (typeof g.document === "undefined") {
  const noop = () => {};
  g.document = {
    createElement: () => ({ style: {}, setAttribute: noop, appendChild: noop }),
    createElementNS: () => ({ style: {}, setAttribute: noop, appendChild: noop }),
    documentElement: { style: {}, className: "" },
    body: { appendChild: noop, removeChild: noop },
    addEventListener: noop,
    removeEventListener: noop,
    getElementsByTagName: () => [],
  };
  (g.window as Mutable).document = g.document;
}

if (typeof g.navigator === "undefined") {
  g.navigator = { userAgent: "", platform: "" };
  (g.window as Mutable).navigator = g.navigator;
}
