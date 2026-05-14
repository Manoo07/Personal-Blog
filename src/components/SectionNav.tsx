import { useMemo, useState, useEffect } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useSectionTree } from "@/hooks/use-api";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  FileText,
  Loader2,
  PanelLeftOpen,
  X,
} from "lucide-react";
import type { ApiSectionNode, SectionSummary } from "@/lib/api";

interface SectionNavProps {
  /** The section the current post belongs to (used to highlight active) */
  section?: SectionSummary | null;
}

/** Collect all section IDs in a subtree (inclusive) */
function collectIds(node: ApiSectionNode): string[] {
  return [node.id, ...(node.children ?? []).flatMap(collectIds)];
}

/** Sort sections: order ASC, then numeric name prefix ASC for ties (e.g. "1. Scopes" before "5. DOM") */
function sortSections(nodes: ApiSectionNode[]): ApiSectionNode[] {
  return [...nodes].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    const numA = parseInt(a.name.match(/^(\d+)/)?.[1] ?? "999", 10);
    const numB = parseInt(b.name.match(/^(\d+)/)?.[1] ?? "999", 10);
    return numA - numB;
  });
}

// ── Recursive section node renderer ──────────────────────────────────────

const INDENT = 8;  // px per nesting level — same rhythm as VS Code
const BASE_PAD = 4; // px left padding for depth-0 items (VS Code has ~4px)

interface SectionNodeProps {
  node: ApiSectionNode;
  depth: number;
  currentSlug?: string;
  activeSectionId?: string | null;
}

const SectionNodeItem = ({
  node,
  depth,
  currentSlug,
  activeSectionId,
}: SectionNodeProps) => {
  const allIds = useMemo(() => collectIds(node), [node]);
  const isAncestorOfActive = activeSectionId ? allIds.includes(activeSectionId) : false;
  const [open, setOpen] = useState(isAncestorOfActive);

  const directPosts = node.posts ?? [];
  const hasChildren = (node.children?.length ?? 0) > 0;
  const hasContent = directPosts.length > 0 || hasChildren;

  if (!hasContent) return null;

  // Left offset: items own their own padding, no outer container padding
  const rowPadLeft = BASE_PAD + depth * INDENT;
  // Guide line x = center of the chevron icon at this depth
  const guideX = rowPadLeft + 6; // 6 ≈ half of w-3 icon

  return (
    <li>
      {/* Section row */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center gap-[3px] py-1.5 pr-1 rounded-[2px] text-left",
          "transition-colors duration-100",
          "hover:bg-secondary/50",
          isAncestorOfActive
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
        style={{ paddingLeft: `${rowPadLeft}px` }}
      >
        {/* Chevron — fixed 12px slot */}
        <span className="shrink-0 w-3 h-3 flex items-center justify-center opacity-60">
          {open
            ? <ChevronDown className="w-3 h-3" />
            : <ChevronRight className="w-3 h-3" />}
        </span>

        {/* Folder icon */}
        {open
          ? <FolderOpen className={cn("shrink-0 w-3 h-3", isAncestorOfActive ? "text-primary" : "")} />
          : <Folder    className={cn("shrink-0 w-3 h-3", isAncestorOfActive ? "text-primary" : "")} />}

        {/* Label */}
        <span className={cn(
          "text-xs leading-none truncate",
          depth === 0 ? "font-medium" : "font-normal",
          isAncestorOfActive && "text-foreground"
        )}>
          {node.name}
        </span>
      </button>

      {/* Expanded content with VS Code-style guide line */}
      {open && (
        <div className="relative">
          {/* Vertical guide line — anchored at the chevron centre */}
          <div
            className="absolute top-0 bottom-0 w-px bg-border/30"
            style={{ left: `${guideX}px` }}
          />

          <div style={{ paddingLeft: `${guideX + 6}px` }}>
            {/* Direct posts */}
            {directPosts.map((post) => {
              const isActive = post.slug === currentSlug;
              return (
                <Link
                  key={post.slug}
                  to={`/blog/${post.slug}`}
                  className={cn(
                    "flex items-center gap-[3px] py-1 pr-1 pl-0 rounded-[2px]",
                    "text-xs leading-none transition-colors duration-100",
                    isActive
                      ? "text-primary font-medium bg-primary/8"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  )}
                >
                  {isActive
                    ? <ChevronRight className="shrink-0 w-3 h-3 opacity-80" />
                    : <FileText    className="shrink-0 w-3 h-3 opacity-40" />}
                  <span className="truncate">{post.title}</span>
                </Link>
              );
            })}

            {/* Child sections */}
            {hasChildren && (
              <ul className="space-y-0">
                {sortSections(node.children!).map((child) => (
                  <SectionNodeItem
                    key={child.id}
                    node={child}
                    depth={depth + 1}
                    currentSlug={currentSlug}
                    activeSectionId={activeSectionId}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </li>
  );
};

// ── Main SectionNav component ────────────────────────────────────────────

const SectionNav = ({ section }: SectionNavProps) => {
  const { slug: currentSlug } = useParams<{ slug: string }>();
  const location = useLocation();
  const { data: sectionData, isLoading } = useSectionTree();

  const [mobileOpen, setMobileOpen] = useState(false);

  const rawSections = useMemo(() => sectionData?.sections ?? [], [sectionData]);
  const sections = useMemo(() => sortSections(rawSections), [rawSections]);

  // Close mobile drawer on route change (user clicked a link)
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const isEmpty = !isLoading && sections.length === 0;

  // ── Shared tree content ────────────────────────────────────────────────
  const treeContent = (
    <>
      <div className="max-h-[calc(100vh-160px)] overflow-y-auto scroll-smooth pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {isLoading ? (
          <div className="py-4 flex items-center justify-center">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ul className="space-y-0">
            {sections.map((topNode) => (
              <SectionNodeItem
                key={topNode.id}
                node={topNode}
                depth={0}
                currentSlug={currentSlug}
                activeSectionId={section?.id ?? null}
              />
            ))}
          </ul>
        )}
      </div>
    </>
  );

  if (isEmpty) return null;

  return (
    <>
      {/* ── Mobile toggle button — visible below xl ── */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="xl:hidden fixed left-3 top-14 z-40 p-2 rounded-lg border border-border/60 bg-card/90 backdrop-blur-sm shadow-md text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all duration-200"
        aria-label="Open sections"
      >
        <PanelLeftOpen className="w-4 h-4" />
      </button>

      {/* ── Mobile overlay + drawer — visible below xl ── */}
      {mobileOpen && (
        <div className="xl:hidden fixed inset-0 z-[60]">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer panel */}
          <nav className="absolute top-0 left-0 h-full w-[260px] max-w-[80vw] bg-background border-r border-border/50 shadow-xl animate-in slide-in-from-left duration-200 flex flex-col">
            <div className="flex items-center justify-between px-2 pt-2 pb-1.5">
              <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Sections
              </h4>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                aria-label="Close sections"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scroll-smooth pb-3 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              {isLoading ? (
                <div className="py-4 flex items-center justify-center">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ul className="space-y-0">
                  {sections.map((topNode) => (
                    <SectionNodeItem
                      key={topNode.id}
                      node={topNode}
                      depth={0}
                      currentSlug={currentSlug}
                      activeSectionId={section?.id ?? null}
                    />
                  ))}
                </ul>
              )}
            </div>
          </nav>
        </div>
      )}

      {/* ── Desktop fixed sidebar — visible at xl+ ── */}
      <aside className="hidden xl:block">
        <nav className="fixed top-24 left-3 xl:left-4 2xl:left-8 w-56 2xl:w-64">
          <div className="rounded-lg border border-border/40 bg-card/50 backdrop-blur-sm">
            <div className="pt-2 pb-1.5" style={{ paddingLeft: `${BASE_PAD + 2}px`, paddingRight: `${BASE_PAD}px` }}>
              <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Sections
              </h4>
            </div>
            {treeContent}
          </div>
        </nav>
      </aside>
    </>
  );
};

export default SectionNav;
