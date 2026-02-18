import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import BlogCard from "@/components/BlogCard";
import Breadcrumb from "@/components/Breadcrumb";
import { usePosts, useSectionTree } from "@/hooks/use-api";
import { Loader2, FileText, ChevronDown, ChevronRight, Folder, FolderOpen, Layers, List } from "lucide-react";
import type { ApiPostSummary, ApiSectionNode } from "@/lib/api";

// ── helpers ────────────────────────────────────────────────────────────────

/** Flatten a section tree into an ordered list with depth info */
function flattenSections(
  nodes: ApiSectionNode[],
  depth = 0
): { node: ApiSectionNode; depth: number }[] {
  const result: { node: ApiSectionNode; depth: number }[] = [];
  for (const n of nodes) {
    result.push({ node: n, depth });
    if (n.children?.length) result.push(...flattenSections(n.children, depth + 1));
  }
  return result;
}

/** Collect all descendant IDs of a section node (inclusive) */
function collectIds(node: ApiSectionNode): string[] {
  return [node.id, ...(node.children ?? []).flatMap(collectIds)];
}

/**
 * Normalised section ID for a post.
 * The list API returns `section: {id, slug, name}` but NOT a top-level `sectionId`.
 * We always prefer `section.id`; fall back to the optional `sectionId` field just in case.
 */
function getPostSectionId(p: ApiPostSummary): string | null {
  return p.section?.id ?? p.sectionId ?? null;
}

// ── Section group component ────────────────────────────────────────────────

interface SectionGroupProps {
  node: ApiSectionNode;
  depth: number;
  posts: ApiPostSummary[];
  allPosts: ApiPostSummary[];
  defaultOpen?: boolean;
  baseIndex: number;
}

const SectionGroup = ({ node, depth, posts, allPosts, defaultOpen = true, baseIndex }: SectionGroupProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const directPosts = posts.filter((p) => getPostSectionId(p) === node.id);
  const totalDescendantPosts = allPosts.filter((p) =>
    collectIds(node).includes(getPostSectionId(p) ?? "")
  ).length;

  if (totalDescendantPosts === 0) return null;

  return (
    <div className="animate-fade-in">
      {/* Section header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 py-2 text-left group transition-colors hover:text-foreground"
      >
        <span className="shrink-0 text-muted-foreground group-hover:text-foreground transition-colors">
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </span>
        <span className="shrink-0 text-muted-foreground">
          {open ? <FolderOpen className="w-3.5 h-3.5" /> : <Folder className="w-3.5 h-3.5" />}
        </span>
        <span className={`font-semibold tracking-tight ${depth === 0 ? "text-base text-foreground" : "text-sm text-foreground/80"}`}>
          {node.name}
        </span>
        <span className="text-xs font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-secondary">
          {totalDescendantPosts}
        </span>
      </button>

      {/* Content */}
      {open && (
        <div
          className={depth > 0 ? "border-l border-border/40 ml-3" : ""}
          style={{ paddingLeft: `${depth === 0 ? 16 : 12}px` }}
        >
          {/* Direct posts in this section */}
          {directPosts.length > 0 && (
            <div>
              {directPosts.map((post, i) => (
                <BlogCard key={post.slug} post={post} index={baseIndex + i} />
              ))}
            </div>
          )}

          {/* Child sections */}
          {(node.children ?? []).map((child) => (
            <SectionGroup
              key={child.id}
              node={child}
              depth={depth + 1}
              posts={posts}
              allPosts={allPosts}
              defaultOpen={depth < 2}
              baseIndex={baseIndex}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main Blog page ──────────────────────────────────────────────────────────

type ViewMode = "all" | "grouped";

const PAGE_SIZE = 20;

const Blog = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [activeSection, setActiveSection] = useState<string>("all");
  const [uncategorizedOpen, setUncategorizedOpen] = useState(true);
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = usePosts({ limit: 100, sort: "createdAt", order: "desc" });
  const { data: sectionData } = useSectionTree();

  const posts = data?.posts ?? [];
  const sections = sectionData?.sections ?? [];
  const flatSections = useMemo(() => flattenSections(sections), [sections]);
  const hasSections = sections.length > 0;

  const unsectionedPosts = useMemo(
    () => posts.filter((p) => !getPostSectionId(p)),
    [posts]
  );

  // Top-level section pills (only sections that have posts anywhere in their subtree)
  const sectionPills = useMemo(
    () =>
      flatSections
        .filter(({ depth }) => depth === 0)
        .filter(({ node }) => posts.some((p) => collectIds(node).includes(getPostSectionId(p) ?? ""))),
    [flatSections, posts]
  );

  // All posts matching current filter (unpaged)
  const filteredPosts = useMemo(() => {
    if (activeSection === "all") return posts;
    if (activeSection === "uncategorized") return unsectionedPosts;
    const node = flatSections.find((s) => s.node.id === activeSection)?.node;
    if (!node) return posts;
    const ids = new Set(collectIds(node));
    return posts.filter((p) => {
      const sid = getPostSectionId(p);
      return sid !== null && ids.has(sid);
    });
  }, [activeSection, posts, unsectionedPosts, flatSections]);

  // Paginated slice for flat view
  const totalPages = Math.ceil(filteredPosts.length / PAGE_SIZE);
  const pagedPosts = useMemo(
    () => filteredPosts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredPosts, page]
  );

  // In "grouped" mode: switch to grouped, reset section filter + page
  const handleGroupedMode = () => {
    setViewMode("grouped");
    setActiveSection("all");
    setPage(1);
  };

  // In "all" mode: flat list, optionally filtered by section pill
  const handleAllMode = () => {
    setViewMode("all");
    setActiveSection("all");
    setPage(1);
  };

  const handleSectionPill = (id: string) => {
    setViewMode("all");
    setActiveSection(id);
    setPage(1);
  };

  const showGrouped = viewMode === "grouped" && hasSections;

  return (
    <Layout>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 pt-4 sm:pt-6 pb-8 sm:pb-12">
        <Breadcrumb items={[{ label: "Home", to: "/" }, { label: "Blog" }]} />

        <div className="mb-4 animate-fade-in">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Blog</h1>
          <p className="text-sm text-muted-foreground">
            Technical writing on systems, databases, languages, and engineering.
          </p>
        </div>

        {/* ── Filter / view bar ── */}
        {!isLoading && (
          <div className="flex flex-wrap items-center gap-1.5 mb-5 animate-fade-in">

            {/* All posts (flat) */}
            <button
              onClick={handleAllMode}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                viewMode === "all" && activeSection === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="w-3 h-3" />
              All
              <span className="font-mono opacity-70">{posts.length}</span>
            </button>

            {/* Grouped by section — only show when sections exist */}
            {hasSections && (
              <button
                onClick={handleGroupedMode}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === "grouped"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <Layers className="w-3 h-3" />
                Grouped
              </button>
            )}

            {/* Divider */}
            {hasSections && <span className="w-px h-4 bg-border mx-0.5" />}

            {/* Per-section filter pills */}
            {sectionPills.map(({ node }) => {
              const count = posts.filter((p) =>
                collectIds(node).includes(getPostSectionId(p) ?? "")
              ).length;
              return (
                <button
                  key={node.id}
                  onClick={() => handleSectionPill(node.id)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    viewMode === "all" && activeSection === node.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Folder className="w-3 h-3" />
                  {node.name}
                  <span className="font-mono opacity-70">{count}</span>
                </button>
              );
            })}

            {/* Uncategorized pill */}
            {unsectionedPosts.length > 0 && (
              <button
                onClick={() => handleSectionPill("uncategorized")}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  viewMode === "all" && activeSection === "uncategorized"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                Uncategorized
                <span className="font-mono opacity-70">{unsectionedPosts.length}</span>
              </button>
            )}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {/* Empty */}
        {!isLoading && posts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{isError ? "Failed to load posts. Please try again later." : "No posts yet. Check back soon!"}</p>
          </div>
        )}

        {/* ── GROUPED VIEW ── accordion by section */}
        {!isLoading && showGrouped && (
          <div className="space-y-2">
            {sections.map((node) => (
              <SectionGroup
                key={node.id}
                node={node}
                depth={0}
                posts={posts}
                allPosts={posts}
                defaultOpen={true}  // depth 0 — always open
                baseIndex={0}
              />
            ))}

            {unsectionedPosts.length > 0 && (
              <div className="animate-fade-in">
                <button
                  type="button"
                  onClick={() => setUncategorizedOpen((o) => !o)}
                  className="w-full flex items-center gap-2 py-2 text-left group hover:text-foreground transition-colors"
                >
                  <span className="shrink-0 text-muted-foreground">
                    {uncategorizedOpen
                      ? <ChevronDown className="w-3.5 h-3.5" />
                      : <ChevronRight className="w-3.5 h-3.5" />}
                  </span>
                  <span className="text-base font-semibold text-foreground/60">Uncategorized</span>
                  <span className="text-xs font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-secondary">
                    {unsectionedPosts.length}
                  </span>
                </button>
                {uncategorizedOpen && (
                  <div>
                    {unsectionedPosts.map((post, i) => (
                      <BlogCard key={post.slug} post={post} index={i} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── FLAT VIEW ── paginated */}
        {!isLoading && !showGrouped && filteredPosts.length > 0 && (
          <>
            <div>
              {pagedPosts.map((post, i) => (
                <BlogCard
                  key={post.slug}
                  post={post}
                  index={(page - 1) * PAGE_SIZE + i}
                  showSection={activeSection === "all" && hasSections}
                />
              ))}
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 mt-8 flex-wrap">
                <button
                  onClick={() => { setPage(1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  disabled={page === 1}
                  className="px-2.5 py-1.5 rounded text-xs font-medium bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  «
                </button>
                <button
                  onClick={() => { setPage((p) => p - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  disabled={page === 1}
                  className="px-2.5 py-1.5 rounded text-xs font-medium bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ‹ Prev
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("…");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === "…" ? (
                      <span key={`ellipsis-${idx}`} className="px-1.5 text-xs text-muted-foreground">…</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => { setPage(item as number); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        className={`min-w-[28px] px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                          page === item
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}

                <button
                  onClick={() => { setPage((p) => p + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  disabled={page === totalPages}
                  className="px-2.5 py-1.5 rounded text-xs font-medium bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next ›
                </button>
                <button
                  onClick={() => { setPage(totalPages); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  disabled={page === totalPages}
                  className="px-2.5 py-1.5 rounded text-xs font-medium bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  »
                </button>

                <span className="ml-2 text-xs text-muted-foreground">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredPosts.length)} of {filteredPosts.length}
                </span>
              </div>
            )}
          </>
        )}

        {/* No results for filter */}
        {!isLoading && !showGrouped && filteredPosts.length === 0 && posts.length > 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No posts in this section yet.</p>
          </div>
        )}
      </section>
    </Layout>
  );
};

export default Blog;

