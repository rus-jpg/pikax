import { useEffect, useState, useCallback } from "react";

export type LayoutVersion = "v1" | "v2";

const STORAGE_KEY = "pikax.layoutVersion";

export function getStoredLayoutVersion(): LayoutVersion {
  if (typeof window === "undefined") return "v2";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "v1" ? "v1" : "v2";
}

/**
 * Map a pathname between v1 and v2 trees.
 * `/projects` <-> `/v2/projects`, `/studio/abc` <-> `/v2/studio/abc`, etc.
 */
export function getMirrorPath(pathname: string, target: LayoutVersion): string {
  const isV2 = pathname === "/v2" || pathname.startsWith("/v2/");
  if (target === "v2") {
    if (isV2) return pathname;
    if (pathname === "/") return "/v2/projects";
    return `/v2${pathname}`;
  }
  // target v1
  if (!isV2) return pathname;
  const stripped = pathname.replace(/^\/v2/, "");
  if (stripped === "" || stripped === "/" || stripped === "/home") return "/projects";
  // v1 has no /projects/$projectId route — open the project in the studio instead.
  const projectMatch = stripped.match(/^\/projects\/([^/]+)$/);
  if (projectMatch) return `/studio/${projectMatch[1]}`;
  // v1 has no /jobs, /library list page maps fine, /labs, /apps exists.
  if (stripped === "/jobs" || stripped === "/labs") return "/projects";
  return stripped;
}

export function useLayoutVersion() {
  const [version, setVersionState] = useState<LayoutVersion>("v2");

  useEffect(() => {
    setVersionState(getStoredLayoutVersion());
  }, []);

  const setVersion = useCallback((v: LayoutVersion) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, v);
    }
    setVersionState(v);
  }, []);

  return { version, setVersion };
}
