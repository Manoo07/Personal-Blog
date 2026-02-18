import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronRight, ChevronDown, X, FolderOpen, Folder, Search } from "lucide-react";
import type { ApiSectionNode } from "@/lib/api";

interface SectionTreeDropdownProps {
  sections: ApiSectionNode[];
  selectedId: string | null;
  onChange: (id: string | null) => void;
  isLoading?: boolean;
}

// ── helpers ─────────────────────────────────────────────────────────────────

function flattenTree(
  nodes: ApiSectionNode[],
  depth = 0
): { node: ApiSectionNode; depth: number }[] {
  const result: { node: ApiSectionNode; depth: number }[] = [];
  for (const n of nodes) {
    result.push({ node: n, depth });
    if (n.children?.length) {
      result.push(...flattenTree(n.children, depth + 1));
    }
  }
  return result;
}

function findNode(
  nodes: ApiSectionNode[],
  id: string
): ApiSectionNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findNode(n.children ?? [], id);
    if (found) return found;
  }
  return null;
}

function buildBreadcrumb(
  nodes: ApiSectionNode[],
  id: string,
  path: string[] = []
): string[] | null {
  for (const n of nodes) {
    if (n.id === id) return [...path, n.name];
    const found = buildBreadcrumb(n.children ?? [], id, [...path, n.name]);
    if (found) return found;
  }
  return null;
}

// ── sub-components ───────────────────────────────────────────────────────────

interface TreeNodeRowProps {
  node: ApiSectionNode;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  hasChildren: boolean;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}

const TreeNodeRow = ({
  node,
  depth,
  isExpanded,
  isSelected,
  hasChildren,
  onToggle,
  onSelect,
}: TreeNodeRowProps) => (
  <div
    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer select-none group transition-colors ${
      isSelected
        ? "bg-primary/15 text-primary"
        : "hover:bg-secondary text-foreground"
    }`}
    style={{ paddingLeft: `${8 + depth * 16}px` }}
    onClick={() => onSelect(node.id)}
  >
    {/* expand / collapse toggle */}
    <span
      className="shrink-0 w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      onClick={(e) => {
        e.stopPropagation();
        if (hasChildren) onToggle(node.id);
      }}
    >
      {hasChildren ? (
        isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )
      ) : (
        <span className="w-3.5 h-3.5" />
      )}
    </span>

    {/* folder icon */}
    <span className="shrink-0 text-muted-foreground">
      {hasChildren && isExpanded ? (
        <FolderOpen className="w-3.5 h-3.5" />
      ) : (
        <Folder className="w-3.5 h-3.5" />
      )}
    </span>

    <span className="text-sm truncate">{node.name}</span>
  </div>
);

// ── recursive tree render ────────────────────────────────────────────────────

interface TreeProps {
  nodes: ApiSectionNode[];
  depth?: number;
  expanded: Set<string>;
  selectedId: string | null;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  searchQuery: string;
}

function matchesSearch(node: ApiSectionNode, q: string): boolean {
  if (node.name.toLowerCase().includes(q)) return true;
  return (node.children ?? []).some((c) => matchesSearch(c, q));
}

const Tree = ({
  nodes,
  depth = 0,
  expanded,
  selectedId,
  onToggle,
  onSelect,
  searchQuery,
}: TreeProps) => {
  const q = searchQuery.toLowerCase();
  const visible = q ? nodes.filter((n) => matchesSearch(n, q)) : nodes;

  return (
    <>
      {visible.map((node) => {
        const hasChildren = (node.children ?? []).length > 0;
        const isExpanded = expanded.has(node.id) || (!!q && hasChildren);
        return (
          <div key={node.id}>
            <TreeNodeRow
              node={node}
              depth={depth}
              isExpanded={isExpanded}
              isSelected={selectedId === node.id}
              hasChildren={hasChildren}
              onToggle={onToggle}
              onSelect={onSelect}
            />
            {hasChildren && isExpanded && (
              <Tree
                nodes={node.children}
                depth={depth + 1}
                expanded={expanded}
                selectedId={selectedId}
                onToggle={onToggle}
                onSelect={onSelect}
                searchQuery={searchQuery}
              />
            )}
          </div>
        );
      })}
    </>
  );
};

// ── main component ───────────────────────────────────────────────────────────

const SectionTreeDropdown = ({
  sections,
  selectedId,
  onChange,
  isLoading,
}: SectionTreeDropdownProps) => {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // auto-expand ancestor nodes when a selection exists
  useEffect(() => {
    if (!selectedId || !sections.length) return;
    const expandAncestors = (nodes: ApiSectionNode[], target: string): boolean => {
      for (const n of nodes) {
        if (n.id === target) return true;
        if (expandAncestors(n.children ?? [], target)) {
          setExpanded((prev) => new Set([...prev, n.id]));
          return true;
        }
      }
      return false;
    };
    expandAncestors(sections, selectedId);
  }, [selectedId, sections]);

  const handleToggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleSelect = (id: string) => {
    onChange(id === selectedId ? null : id);
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const breadcrumb = selectedId ? buildBreadcrumb(sections, selectedId) : null;
  const selectedLabel = breadcrumb ? breadcrumb.join(" › ") : null;

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-md border text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-primary ${
          open ? "ring-2 ring-primary border-primary/50" : "border-border"
        } bg-background text-foreground`}
      >
        <span className={`truncate ${selectedLabel ? "text-foreground" : "text-muted-foreground"}`}>
          {isLoading ? "Loading sections…" : selectedLabel ?? "No section (optional)"}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {selectedLabel && (
            <span
              onClick={handleClear}
              className="p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title="Remove section"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Breadcrumb preview below trigger */}
      {breadcrumb && breadcrumb.length > 1 && (
        <p className="mt-1 text-xs text-muted-foreground">
          {breadcrumb.map((part, i) => (
            <span key={i}>
              {i > 0 && <span className="mx-1 opacity-50">›</span>}
              <span className={i === breadcrumb.length - 1 ? "text-foreground font-medium" : ""}>
                {part}
              </span>
            </span>
          ))}
        </p>
      )}

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 mt-1.5 w-full min-w-[240px] rounded-md border border-border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95 duration-100">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60">
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sections…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Tree */}
          <div className="max-h-64 overflow-y-auto py-1 px-1">
            {sections.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No sections yet. Create them in Admin → Sections.
              </p>
            ) : (
              <Tree
                nodes={sections}
                expanded={expanded}
                selectedId={selectedId}
                onToggle={handleToggle}
                onSelect={handleSelect}
                searchQuery={search}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SectionTreeDropdown;
