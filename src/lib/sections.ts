import type { ApiSectionNode } from "@/lib/api";

/** Sort by order ASC, then by leading numeric prefix for ties (e.g. "1. Scopes" before "5. DOM"). */
export function sortSections(nodes: ApiSectionNode[]): ApiSectionNode[] {
  return [...nodes].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    const numA = parseInt(a.name.match(/^(\d+)/)?.[1] ?? "999", 10);
    const numB = parseInt(b.name.match(/^(\d+)/)?.[1] ?? "999", 10);
    return numA - numB;
  });
}
