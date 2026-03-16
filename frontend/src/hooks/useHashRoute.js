import { useEffect, useMemo, useState } from "react";

function parseHash() {
  const raw = window.location.hash || "#/dashboard";
  const withoutHash = raw.replace(/^#/, "");
  const [pathPart, queryString] = withoutHash.split("?");
  const segments = pathPart.split("/").filter(Boolean);
  const params = new URLSearchParams(queryString || "");
  const query = Object.fromEntries(params.entries());

  return {
    raw,
    path: pathPart,
    segments,
    name: segments[0] || "dashboard",
    id: segments[1] || null,
    query,
  };
}

export function useHashRoute() {
  const [route, setRoute] = useState(parseHash());

  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", onChange);
    if (!window.location.hash) {
      window.location.hash = "#/dashboard";
    }
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const navigate = useMemo(
    () => (path) => {
      const hash = path.startsWith("#") ? path : `#${path}`;
      if (window.location.hash !== hash) {
        window.location.hash = hash;
      }
    },
    []
  );

  return { route, navigate };
}
