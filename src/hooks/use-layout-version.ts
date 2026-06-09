import { useEffect, useState, useCallback } from "react";

export type LayoutVersion = "v1" | "v2";

const STORAGE_KEY = "pikax.layoutVersion";

export function getStoredLayoutVersion(): LayoutVersion {
  if (typeof window === "undefined") return "v1";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "v2" ? "v2" : "v1";
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
  return stripped === "" ? "/projects" : stripped;
}

export function useLayoutVersion() {
  const [version, setVersionState] = useState<LayoutVersion>("v1");

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
