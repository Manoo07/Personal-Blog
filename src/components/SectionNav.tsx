import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useSectionTree, useUserProgress } from "@/hooks/use-api";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  FileText,
  Loader2,
  PanelLeftOpen,
  X,
  CheckCircle2,
} from "lucide-react";
import type { ApiSectionNode, SectionSummary } from "@/lib/api";

interface SectionNavProps {
  section?: SectionSummary | null;
}

/** Collect every section ID in a subtree (inclusive). */
function collectIds(node: ApiSectionNode): string[] {
  return [node.id, ...(node.children ?? []).flatMap(collectIds)];
}

const FOLDER_PALETTE = [
  { open: "text-amber-400",   closed: "text-amber-500/40"   },
  { open: "text-sky-400",     closed: "text-sky-500/40"     },
  { open: "text-emerald-400", closed: "text-emerald-500/40" },
  { open: "text-violet-400",  closed: "text-violet-500/40"  },
];

function folderColor(depth: number, isOpen: boolean): string {
  const e = FOLDER_PALETTE[Math.min(depth, FOLDER_PALETTE.length - 1)];
  return isOpen ? e.open : e.closed;
}

/** Sort by order ASC, then by leading numeric prefix for ties. */
function sortSections(nodes: ApiSectionNode[]): ApiSectionNode[] {
  return [...nodes].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    const numA = parseInt(a.name.match(/^(\d+)/)?.[1] ?? "999", 10);
    const numB = parseInt(b.name.match(/^(\d+)/)?.[1] ?? "999", 10);
    return numA - numB;
  });
}

// ── Recursive section node ───────────────────────────────────────────────

interface SectionNodeProps {
  node: ApiSectionNode;
  depth: number;
  currentSlug?: string;
  activeSectionId?: string | null;
  completedSlugs: Set<string>;
}

const SectionNodeItem = ({
  node,
  depth,
  currentSlug,
  activeSectionId,
  completedSlugs,
}: SectionNodeProps) => {
  const allIds = useMemo(() => collectIds(node), [node]);
  const isAncestorOfActive =
    activeSectionId != null && allIds.includes(activeSectionId);

  const [open, setOpen] = useState(isAncestorOfActive);

  // Open (never force-close) when navigating into this subtree
  useEffect(() => {
    if (isAncestorOfActive) setOpen(true);
  }, [isAncestorOfActive]);

  const directPosts = node.posts ?? [];
  const hasChildren = (node.children?.length ?? 0) > 0;
  const hasContent = directPosts.length > 0 || hasChildren;

  // Count completed posts in this section (direct only for badge)
  const completedInSection = directPosts.filter((p) => completedSlugs.has(p.slug)).length;
  const showBadge = completedInSection > 0 && directPosts.length > 0;

  if (!hasContent) return null;

  const indent = depth * 6;

  return (
    <li>
      {/* ── Section header button ─────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={node.name}
        style={{ paddingLeft: `${indent}px` }}
        className={cn(
          "flex items-center gap-1 py-1 pr-3 rounded transition-colors duration-150 text-left",
          "hover:bg-secondary/60",
          depth === 0
            ? cn(
                "text-[11px] font-semibold",
                isAncestorOfActive
                  ? "text-foreground"
                  : "text-muted-foreground/50 hover:text-muted-foreground/80"
              )
            : cn(
                "text-[11px]",
                isAncestorOfActive
                  ? "text-foreground/90"
                  : "text-muted-foreground/60 hover:text-muted-foreground/80"
              )
        )}
      >
        {/* chevron */}
        <span className="shrink-0 w-3 flex items-center justify-center">
          {open ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </span>

        {/* folder icon — depth-based VS Code colours */}
        <span className={cn("shrink-0", folderColor(depth, open || isAncestorOfActive))}>
          {open ? (
            <FolderOpen className="w-3.5 h-3.5" />
          ) : (
            <Folder className="w-3.5 h-3.5" />
          )}
        </span>

        {/* name — truncated with ellipsis; full title visible on hover via title attr */}
        <span className="leading-none max-w-[160px] truncate">{node.name}</span>

        {/* progress badge */}
        {showBadge && (
          <span className="ml-auto shrink-0 text-[9px] tabular-nums text-emerald-500/80 font-medium">
            {completedInSection}/{directPosts.length}
          </span>
        )}

        {/* collapsed indicator for non-active root sections */}
        {!open && !isAncestorOfActive && !showBadge && depth === 0 && (
          <span className="ml-1 text-[10px] text-muted-foreground/30 shrink-0">···</span>
        )}
      </button>

      {/* ── Expanded content ──────────────────────────────────── */}
      {open && (
        <div
          className="border-l border-border/30"
          style={{ marginLeft: `${indent + 3}px` }}
        >
          {/* Direct posts */}
          {directPosts.length > 0 && (
            <ul className="pl-1 py-0.5 space-y-0">
              {directPosts.map((post) => {
                const isActive = post.slug === currentSlug;
                const isDone = completedSlugs.has(post.slug);
                return (
                  <li key={post.slug}>
                    <Link
                      to={`/blog/${post.slug}`}
                      data-active={isActive ? "true" : undefined}
                      title={post.title}
                      className={cn(
                        "flex items-center gap-1.5 py-1 px-1.5 rounded transition-colors duration-150 text-[11px]",
                        "hover:text-primary",
                        isActive
                          ? "text-primary font-medium bg-primary/10"
                          : "text-muted-foreground/60"
                      )}
                    >
                      {isActive ? (
                        <ChevronRight className={cn("w-3 h-3 shrink-0", folderColor(depth, true))} />
                      ) : isDone ? (
                        <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-500/70" />
                      ) : (
                        <FileText className={cn("w-3 h-3 shrink-0", folderColor(depth, false))} />
                      )}
                      <span className="max-w-[160px] truncate">{post.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

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
                  completedSlugs={completedSlugs}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
};

// ── Main SectionNav ──────────────────────────────────────────────────────

const SectionNav = ({ section }: SectionNavProps) => {
  const { slug: currentSlug } = useParams<{ slug: string }>();
  const location = useLocation();
  const { data: sectionData, isLoading } = useSectionTree();
  const { data: progressData } = useUserProgress();

  const completedSlugs = useMemo(
    () => new Set((progressData?.completed ?? []).map((c) => c.postSlug)),
    [progressData]
  );

  const [mobileOpen, setMobileOpen] = useState(false);

  const desktopContainerRef = useRef<HTMLDivElement>(null);
  const mobileContainerRef = useRef<HTMLDivElement>(null);

  const rawSections = useMemo(() => sectionData?.sections ?? [], [sectionData]);
  const sections = useMemo(() => sortSections(rawSections), [rawSections]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Auto-scroll the sidebar container to show the active post
  const scrollToActive = useCallback((container: HTMLDivElement | null) => {
    if (!container) return;
    // Delay so the tree has time to expand before measuring
    setTimeout(() => {
      const activeEl = container.querySelector<HTMLElement>('[data-active="true"]');
      if (!activeEl) return;
      const elTop = activeEl.offsetTop;
      const elH = activeEl.clientHeight;
      const cH = container.clientHeight;
      container.scrollTo({
        top: Math.max(0, elTop - cH / 2 + elH / 2),
        behavior: "smooth",
      });
    }, 250);
  }, []);

  useEffect(() => {
    scrollToActive(desktopContainerRef.current);
  }, [currentSlug, sections, scrollToActive]);

  useEffect(() => {
    if (mobileOpen) scrollToActive(mobileContainerRef.current);
  }, [mobileOpen, currentSlug, sections, scrollToActive]);

  const isEmpty = !isLoading && sections.length === 0;

  // ── Shared tree ──────────────────────────────────────────────────────

  const tree = (containerRef: React.RefObject<HTMLDivElement | null>, maxH: string) => (
    <div
      ref={containerRef}
      className={cn(
        "overflow-y-auto overflow-x-auto scroll-smooth pb-3",
        "scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent",
        "w-full",
        maxH
      )}
    >
      {isLoading ? (
        <div className="py-4 flex items-center justify-center">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        /* min-w-max lets deeply-nested items extend past the container width
           so the outer overflow-x: auto can kick in */
        <div className="min-w-max px-2 pt-0.5">
          <ul className="space-y-0.5">
            {sections.map((topNode) => (
              <SectionNodeItem
                key={topNode.id}
                node={topNode}
                depth={0}
                currentSlug={currentSlug}
                activeSectionId={section?.id ?? null}
                completedSlugs={completedSlugs}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  if (isEmpty) return null;

  return (
    <>
      {/* ── Mobile toggle ── */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="xl:hidden fixed left-3 top-14 z-40 p-2 rounded-lg border border-border/60 bg-card/90 backdrop-blur-sm shadow-md text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all duration-200"
        aria-label="Open sections"
      >
        <PanelLeftOpen className="w-4 h-4" />
      </button>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="xl:hidden fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <nav className="absolute top-0 left-0 h-full w-[260px] max-w-[80vw] bg-background border-r border-border/50 shadow-xl animate-in slide-in-from-left duration-200 flex flex-col">
            <div className="flex items-center justify-between px-3 pt-3 pb-2 shrink-0">
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
            <div className="flex-1 overflow-hidden">
              {tree(mobileContainerRef, "h-full")}
            </div>
          </nav>
        </div>
      )}

      {/* ── Desktop fixed sidebar ── */}
      <aside className="hidden xl:block">
        <nav className="fixed top-24 left-3 xl:left-4 2xl:left-8">
          <div
            className="rounded-lg border border-border/40 bg-card/50 backdrop-blur-sm"
            style={{ width: "max-content", minWidth: "200px", maxWidth: "280px" }}
          >
            <div className="px-3 pt-3 pb-1.5 shrink-0">
              <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Sections
              </h4>
            </div>
            {tree(desktopContainerRef, "max-h-[calc(100vh-160px)]")}
          </div>
        </nav>
      </aside>
    </>
  );
};

export default SectionNav;
