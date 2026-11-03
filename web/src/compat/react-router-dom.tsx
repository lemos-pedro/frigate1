/*
 * Compatibility layer that mimics the react-router-dom v6 API used by this
 * app, implemented on top of the History API. The project routes through
 * TanStack Start, which keeps a catch-all route rendering the legacy App;
 * this module keeps the 60+ existing `react-router-dom` imports working
 * without rewriting them.
 *
 * Supported surface (the only symbols imported by app code):
 * BrowserRouter, Routes, Route, Link, NavLink, Navigate, Outlet,
 * useNavigate, useLocation, useParams, useSearchParams, useMatch.
 */
import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";

type RouterLocation = {
  pathname: string;
  search: string;
  hash: string;
  state?: any;
};

type NavigateOptions = {
  replace?: boolean;
  state?: unknown;
};

type RouterContextValue = {
  location: RouterLocation;
  basename: string;
  navigate: (to: string | number, options?: NavigateOptions) => void;
};

const RouterContext = createContext<RouterContextValue | null>(null);

const MatchContext = createContext<{
  leaf: ReactNode;
  depth: number;
  params: Record<string, string>;
} | null>(null);

function normalizeBasename(basename?: string): string {
  if (!basename || basename === "") return "/";
  if (!basename.startsWith("/")) return `/${basename}`;
  return basename;
}

function stripBasename(pathname: string, basename: string): string {
  if (basename === "/") return pathname;
  if (pathname === basename) return "/";
  if (pathname.startsWith(`${basename}/`)) return pathname.slice(basename.length);
  return pathname;
}

function parseLocation(basename: string): RouterLocation {
  const { pathname, search, hash } = window.location;
  return {
    pathname: stripBasename(pathname, basename),
    search,
    hash,
  };
}

function joinPath(a: string, b: string): string {
  const left = a.endsWith("/") ? a.slice(0, -1) : a;
  const right = b.startsWith("/") ? b : `/${b}`;
  if (right === "/") return left || "/";
  return `${left}${right}`;
}

// Inside the router, route paths are relative to their parent; normalize
// pattern definitions (leading slash is optional).
function relativePattern(parent: string, path: string): string {
  const cleaned = path.replace(/^\//, "");
  return cleaned === "" ? parent : joinPath(parent, cleaned);
}

type CompiledPattern = {
  regex: RegExp;
  keys: string[];
};

function compilePattern(pattern: string): CompiledPattern {
  const keys: string[] = [];
  const segments = pattern.replace(/^\//, "").split("/");
  const source = segments
    .map((segment) => {
      if (segment === "*") return "(.*)";
      if (segment.startsWith(":")) {
        keys.push(segment.slice(1));
        return "([^/]+)";
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  return {
    regex: new RegExp(`^/${source}${source === "(.*)" ? "" : "/?$"}`),
    keys,
  };
}

function matchPattern(
  pattern: string,
  pathname: string,
): Record<string, string> | null {
  const { regex, keys } = compilePattern(pattern);
  const result = regex.exec(pathname);
  if (!result) return null;
  const params: Record<string, string> = {};
  keys.forEach((key, i) => {
    const value = result[i + 1];
    if (value !== undefined) params[key] = decodeURIComponent(value);
  });
  return params;
}

function resolveTo(to: string | number): string {
  if (typeof to === "number") return String(to);
  // Absolute URLs and protocol-relative links are handed to the browser.
  if (/^(https?:)?\/\//i.test(to)) return to;
  return to;
}

function hrefFor(to: string, basename: string): string {
  if (/^(https?:)?\/\//i.test(to)) return to;
  const [pathPart, ...rest] = to.split("?");
  const hashSplit = pathPart.split("#");
  let pathname = hashSplit[0] ?? "/";
  let search = rest.length ? `?${rest.join("?")}` : "";
  const hash = hashSplit.length > 1 ? `#${hashSplit.slice(1).join("#")}` : "";

  if (pathname.startsWith("/")) {
    const full =
      basename === "/" ? pathname : `${basename.replace(/\/$/, "")}${pathname}`;
    return `${full}${search}${hash}`;
  }
  // Relative "to" (e.g. "../settings") resolves against the current pathname.
  const base = parseLocation(basename);
  const current = base.pathname.split("/").filter(Boolean);
  for (const part of pathname.split("/").filter(Boolean)) {
    if (part === "..") current.pop();
    else if (part !== ".") current.push(part);
  }
  pathname = `/${current.join("/")}`;
  search = search ? `?${rest.join("?")}` : "";
  const full =
    basename === "/" ? pathname : `${basename.replace(/\/$/, "")}${pathname}`;
  return `${full}${search}${hash}`;
}

export function BrowserRouter({
  basename,
  children,
}: {
  basename?: string;
  children: ReactNode;
}) {
  const base = normalizeBasename(basename);
  const [location, setLocation] = useState<RouterLocation>(() =>
    parseLocation(base),
  );

  useEffect(() => {
    const onPopState = () => setLocation(parseLocation(base));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [base]);

  const navigate = useMemo(() => {
    const push = (to: string | number, options?: NavigateOptions) => {
      if (typeof to === "number") {
        window.history.go(to);
        return;
      }
      // Absolute URLs are handed to the browser.
      if (/^(https?:)?\/\//i.test(to)) {
        const absHref = hrefFor(to, base);
        if (options?.replace) window.location.replace(absHref);
        else window.location.assign(absHref);
        return;
      }
      const href = hrefFor(to, base);
      const [pathPart, queryPart] = href.split("?");
      const hashPart = pathPart.includes("#")
        ? `#${pathPart.split("#").slice(1).join("#")}`
        : "";
      const fullPath = pathPart.split("#")[0] ?? "/";
      const previous = window.location;
      const nextState: RouterLocation = {
        pathname: stripBasename(fullPath, base),
        search: queryPart ? `?${queryPart}` : "",
        hash: hashPart,
        state: options?.state,
      };
      if (options?.replace) {
        window.history.replaceState(options?.state ?? null, "", href);
      } else {
        window.history.pushState(options?.state ?? null, "", href);
      }
      if (
        nextState.pathname !== stripBasename(previous.pathname, base) ||
        nextState.search !== previous.search ||
        nextState.hash !== previous.hash
      ) {
        setLocation(nextState);
      } else {
        setLocation({ ...nextState });
      }
      window.scrollTo(0, 0);
    };
    return push;
  }, [base]);

  const value = useMemo<RouterContextValue>(
    () => ({ location, basename: base, navigate }),
    [location, base, navigate],
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useLocation(): RouterLocation {
  const ctx = useContext(RouterContext);
  if (!ctx) {
    return parseLocation(normalizeBasename(window.baseUrl));
  }
  return ctx.location;
}

export function useNavigate() {
  const ctx = useContext(RouterContext);
  if (!ctx) {
    throw new Error("useNavigate must be used within a BrowserRouter");
  }
  return ctx.navigate;
}

export function useParams(): Record<string, string> {
  const match = useContext(MatchContext);
  return match?.params ?? {};
}

export function useSearchParams(): [
  URLSearchParams,
  (
    next:
      | URLSearchParams
      | string
      | Record<string, string>
      | ((prev: URLSearchParams) => URLSearchParams | string | Record<string, string>),
    options?: NavigateOptions,
  ) => void,
] {
  const ctx = useContext(RouterContext);
  const location = useLocation();
  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  if (!ctx) {
    throw new Error("useSearchParams must be used within a BrowserRouter");
  }
  const setSearchParams = (
    next:
      | URLSearchParams
      | string
      | Record<string, string>
      | ((prev: URLSearchParams) => URLSearchParams | string | Record<string, string>),
    options?: NavigateOptions,
  ) => {
    const resolved =
      typeof next === "function" ? next(params) : next;
    let search: string;
    if (resolved instanceof URLSearchParams) search = resolved.toString();
    else if (typeof resolved === "string") search = resolved.replace(/^\?/, "");
    else search = new URLSearchParams(resolved).toString();
    ctx.navigate(`${location.pathname}${search ? `?${search}` : ""}`, options);
  };
  return [params, setSearchParams];
}

export function useMatch(pattern: string):
  | {
      pathname: string;
      params: Record<string, string>;
      pathnameBase: string;
      pattern: { path: string };
    }
  | null {
  const ctx = useContext(RouterContext);
  if (!ctx) return null;
  const location = ctx.location;
  // Support both router-relative patterns and full paths that include the
  // basename (e.g. the value of window.baseUrl).
  const candidate = pattern.startsWith("/")
    ? stripBasename(pattern, ctx.basename)
    : pattern;
  const params = matchPattern(candidate, location.pathname);
  if (!params) return null;
  return {
    pathname: location.pathname,
    pathnameBase: candidate,
    params,
    pattern: { path: pattern },
  };
}

type RouteProps = {
  path?: string;
  index?: boolean;
  caseSensitive?: boolean;
  element?: ReactNode;
  children?: ReactNode;
};

type RouteEntry = {
  pattern: string;
  wrappers: ReactNode[];
  leaf: ReactNode;
};

function flattenRoutes(
  children: ReactNode,
  parentPattern: string,
  wrappers: ReactNode[],
  out: RouteEntry[],
): void {
  const childArray = Array.isArray(children) ? children.flat() : [children];
  childArray.forEach((child) => {
    if (!child || typeof child !== "object") return;
    const props = (child as { props?: RouteProps }).props;
    if (!props) return;
    const pattern = relativePattern(
      parentPattern,
      props.path ?? (props.index ? "index" : ""),
    );
    const resolvedPattern = pattern.endsWith("/index")
      ? pattern.slice(0, -"/index".length)
      : pattern;
    if (props.children) {
      flattenRoutes(
        props.children,
        resolvedPattern,
        [...wrappers, props.element],
        out,
      );
    } else {
      out.push({
        pattern: resolvedPattern,
        wrappers,
        leaf: props.element,
      });
    }
  });
}

export function Routes({ children }: { children: ReactNode }) {
  const ctx = useContext(RouterContext);
  if (!ctx) {
    throw new Error("Routes must be used within a BrowserRouter");
  }
  const entries = useMemo(() => {
    const out: RouteEntry[] = [];
    flattenRoutes(children, "/", [], out);
    return out;
  }, [children]);

  let best: { entry: RouteEntry; params: Record<string, string> } | null = null;
  for (const entry of entries) {
    if (entry.pattern === "" || entry.pattern === "index") {
      if (ctx.location.pathname === "/" || ctx.location.pathname === "") {
        best = { entry, params: {} };
        break;
      }
      continue;
    }
    const params = matchPattern(entry.pattern, ctx.location.pathname);
    if (params) {
      best = { entry, params };
      break;
    }
  }

  if (!best) return null;

  // Render wrapper elements around the leaf; Outlet() unwraps one level.
  const depth = best.entry.wrappers.length;
  return (
    <MatchContext.Provider
      value={{ leaf: best.entry.leaf, depth, params: best.params }}
    >
      {best.entry.wrappers[0] ?? <Outlet />}
    </MatchContext.Provider>
  );
}

export function Route(_props: RouteProps): null {
  // Declarative route definitions are consumed by <Routes /> via props.
  return null;
}

export function Outlet(): ReactNode {
  const match = useContext(MatchContext);
  if (!match) return null;
  if (match.depth <= 0) return match.leaf;
  return (
    <MatchContext.Provider
      value={{ leaf: match.leaf, depth: match.depth - 1, params: match.params }}
    >
      <Outlet />
    </MatchContext.Provider>
  );
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  to: string | number;
  replace?: boolean;
  state?: unknown;
};

export function Link({ to, replace, state, children, onClick, ...rest }: LinkProps) {
  const navigate = useNavigate();
  const href =
    typeof to === "number" ? undefined : hrefFor(to, normalizeBasename(window.baseUrl));

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    navigate(to, { replace, state });
  };

  return (
    <a href={href} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}

type NavLinkProps = Omit<LinkProps, "className"> & {
  className?:
    | string
    | ((props: { isActive: boolean; isPending: boolean }) => string | undefined);
};

export function NavLink({
  to,
  className,
  children,
  ...rest
}: NavLinkProps) {
  const location = useLocation();
  const target = typeof to === "string" ? to.replace(/^\//, "") : "";
  const current = location.pathname.replace(/^\//, "");
  const isActive =
    typeof to === "string" &&
    (target === "" ? current === "" : current === target || current.startsWith(`${target}/`));
  const resolvedClassName =
    typeof className === "function" ? className({ isActive, isPending: false }) : className;

  return (
    <Link to={to} className={resolvedClassName} {...rest}>
      {children}
    </Link>
  );
}

export function Navigate({
  to,
  replace,
  state,
}: {
  to: string | number;
  replace?: boolean;
  state?: unknown;
}): null {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(to, { replace, state });
  }, [to, replace, state, navigate]);
  return null;
}
