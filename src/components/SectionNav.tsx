import { useMemo, useState, useEffect } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useSectionTree, usePosts } from "@/hooks/use-api";
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

// ── Recursive section node renderer ──────────────────────────────────────

interface SectionNodeProps {
  node: ApiSectionNode;
  depth: number;
  posts: { slug: string; title: string; sectionId: string | null }[];
  currentSlug?: string;
  activeSectionId?: string | null;
}

const SectionNodeItem = ({
  node,
  depth,
  posts,
  currentSlug,
  activeSectionId,
}: SectionNodeProps) => {
  // Auto-expand if the active post lives anywhere inside this subtree
  const allIds = useMemo(() => collectIds(node), [node]);
  const isAncestorOfActive = activeSectionId
    ? allIds.includes(activeSectionId)
    : false;

  const [open, setOpen] = useState(isAncestorOfActive);

  const directPosts = useMemo(
    () => posts.filter((p) => p.sectionId === node.id),
    [posts, node.id]
  );
  const hasChildren = (node.children?.length ?? 0) > 0;
  const hasContent = directPosts.length > 0 || hasChildren;

  if (!hasContent) return null;

  return (
    <li>
      {/* Section heading — toggles open/close */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full flex items-center gap-1.5 py-1.5 rounded transition-all duration-200 text-left",
          "hover:text-foreground",
          depth === 0
            ? "text-xs font-medium text-foreground"
            : "text-[11px] text-muted-foreground"
        )}
        style={{ paddingLeft: `${depth * 10}px` }}
      >
        <span className="shrink-0 text-muted-foreground">
          {open ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </span>
        <span className="shrink-0">
          {open ? (
            <FolderOpen
              className={cn(
                "w-3.5 h-3.5",
                isAncestorOfActive ? "text-primary" : "text-muted-foreground"
              )}
            />
          ) : (
            <Folder
              className={cn(
                "w-3.5 h-3.5",
                isAncestorOfActive ? "text-primary" : "text-muted-foreground"
              )}
            />
          )}
        </span>
        <span
          className={cn(
            "leading-snug line-clamp-1",
            isAncestorOfActive && depth === 0 && "text-primary"
          )}
        >
          {node.name}
        </span>
      </button>

      {/* Expanded content */}
      {open && (
        <div
          className="border-l border-border/30 ml-[7px]"
          style={{ marginLeft: `${depth * 10 + 7}px` }}
        >
          {/* Direct posts */}
          {directPosts.length > 0 && (
            <ul className="space-y-0.5 pl-2">
              {directPosts.map((post) => {
                const isActive = post.slug === currentSlug;
                return (
                  <li key={post.slug}>
                    <Link
                      to={`/blog/${post.slug}`}
                      className={cn(
                        "flex items-start gap-1 py-1 px-1.5 rounded transition-all duration-200 text-[11px]",
                        "hover:text-primary",
                        isActive
                          ? "text-primary font-medium bg-primary/10"
                          : "text-muted-foreground"
                      )}
                    >
                      {isActive ? (
                        <ChevronRight className="w-3 h-3 shrink-0 mt-0.5" />
                      ) : (
                        <FileText className="w-3 h-3 shrink-0 mt-0.5 opacity-50" />
                      )}
                      <span className="line-clamp-2 leading-snug">
                        {post.title}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Child sections */}
          {hasChildren && (
            <ul className="space-y-0">
              {[...node.children!]
                .sort((a, b) => {
                  if (a.order !== b.order) return a.order - b.order;
                  const numA = parseInt(a.name.match(/^\d+/)?.[0] ?? "0", 10);
                  const numB = parseInt(b.name.match(/^\d+/)?.[0] ?? "0", 10);
                  return numA - numB;
                })
                .map((child) => (
                <SectionNodeItem
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  posts={posts}
                  currentSlug={currentSlug}
                  activeSectionId={activeSectionId}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
};

// ── Main SectionNav component ────────────────────────────────────────────

const SectionNav = ({ section }: SectionNavProps) => {
  const { slug: currentSlug } = useParams<{ slug: string }>();
  const location = useLocation();
  const { data: sectionData, isLoading: sectionsLoading } = useSectionTree();
  const { data: postsData, isLoading: postsLoading } = usePosts({
    limit: 100,
    sort: "createdAt",
    order: "desc",
  });

  const [mobileOpen, setMobileOpen] = useState(false);

  const sections = useMemo(() => sectionData?.sections ?? [], [sectionData]);

  // Sort sections by order, then by numeric prefix in name as fallback
  const numericSort = (a: ApiSectionNode, b: ApiSectionNode) => {
    if (a.order !== b.order) return a.order - b.order;
    const numA = parseInt(a.name.match(/^\d+/)?.[0] ?? "0", 10);
    const numB = parseInt(b.name.match(/^\d+/)?.[0] ?? "0", 10);
    return numA - numB;
  };

  const sortedSections = useMemo(
    () => [...sections].sort(numericSort),
    [sections]
  );

  // Flatten all posts into a simple list with sectionId
  const posts = useMemo(
    () =>
      (postsData?.posts ?? []).map((p) => ({
        slug: p.slug,
        title: p.title,
        sectionId: p.section?.id ?? null,
      })),
    [postsData]
  );

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

  const isLoading = sectionsLoading || postsLoading;
  const isEmpty = !isLoading && sections.length === 0;

  // ── Shared tree content ────────────────────────────────────────────────
  const treeContent = (
    <>
      <div className="max-h-[calc(100vh-160px)] overflow-y-auto scroll-smooth px-2 pb-3 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {isLoading ? (
          <div className="py-4 flex items-center justify-center">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ul className="space-y-0.5">
            {sortedSections.map((topNode) => (
              <SectionNodeItem
                key={topNode.id}
                node={topNode}
                depth={0}
                posts={posts}
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
            <div className="flex items-center justify-between px-3 pt-3 pb-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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

            <div className="flex-1 overflow-y-auto scroll-smooth px-2 pb-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
              {isLoading ? (
                <div className="py-4 flex items-center justify-center">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ul className="space-y-0.5">
                  {sortedSections.map((topNode) => (
                    <SectionNodeItem
                      key={topNode.id}
                      node={topNode}
                      depth={0}
                      posts={posts}
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
            <div className="px-3 pt-3 pb-2">
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
