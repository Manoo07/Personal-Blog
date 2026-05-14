import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import Breadcrumb from "@/components/Breadcrumb";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Folder,
  Loader2,
  Check,
  X,
  LogOut,
  FolderTree,
  BookOpen,
  Search,
  Link2,
  Link2Off,
  GripVertical,
} from "lucide-react";
import {
  useVerifyToken,
  useLogout,
  useSectionTree,
  useCreateSection,
  useUpdateSection,
  useDeleteSection,
  useReorderSections,
  useAdminPosts,
  useUpdatePost,
} from "@/hooks/use-api";
import { getToken } from "@/lib/api";
import type { ApiSectionNode, ApiPostSummary } from "@/lib/api";

// ── helpers ───────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

// ── Inline editor component ───────────────────────────────────────────────

interface InlineEditorProps {
  initialName?: string;
  onSave: (name: string) => void;
  onCancel: () => void;
  isPending?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}

const InlineEditor = ({
  initialName = "",
  onSave,
  onCancel,
  isPending,
  placeholder = "Section name",
  autoFocus = true,
}: InlineEditorProps) => {
  const [value, setValue] = useState(initialName);

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed) onSave(trimmed);
  };

  return (
    <div className="flex items-center gap-1.5">
      <input
        autoFocus={autoFocus}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") onCancel();
        }}
        placeholder={placeholder}
        className="flex-1 min-w-0 px-2 py-1 text-sm rounded-md bg-background border border-primary ring-2 ring-primary/30 focus:outline-none"
      />
      <button
        type="button"
        onClick={commit}
        disabled={isPending || !value.trim()}
        className="p-1 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
        title="Save"
      >
        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="p-1 rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors"
        title="Cancel"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

// ── Post assignment panel ────────────────────────────────────────────────

interface PostAssignPanelProps {
  sectionId: string;
  allPosts: ApiPostSummary[];
  onAssign: (postId: string, sectionId: string) => Promise<void>;
  onUnassign: (postId: string) => Promise<void>;
  isPending: boolean;
}

const PostAssignPanel = ({
  sectionId,
  allPosts,
  onAssign,
  onUnassign,
  isPending,
}: PostAssignPanelProps) => {
  const [search, setSearch] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const assigned = useMemo(
    () => allPosts.filter((p) => p.sectionId === sectionId),
    [allPosts, sectionId]
  );

  const q = search.toLowerCase().trim();
  const suggestions = useMemo(
    () =>
      allPosts.filter(
        (p) =>
          p.sectionId !== sectionId &&
          (q === "" || p.title.toLowerCase().includes(q) || p.tags.some((t) => t.includes(q)))
      ),
    [allPosts, sectionId, q]
  );

  const handleAssign = async (postId: string) => {
    setPendingId(postId);
    await onAssign(postId, sectionId);
    setPendingId(null);
  };

  const handleUnassign = async (postId: string) => {
    setPendingId(postId);
    await onUnassign(postId);
    setPendingId(null);
  };

  return (
    <div className="mt-1 mb-2 rounded-md border border-border/50 bg-background/60 overflow-hidden">
      {/* Assigned posts */}
      {assigned.length > 0 && (
        <div className="px-3 pt-2.5 pb-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Assigned ({assigned.length})
          </p>
          <div className="flex flex-col gap-0.5">
            {assigned.map((post) => (
              <div
                key={post.id}
                className="flex items-center justify-between gap-2 px-2 py-1 rounded hover:bg-secondary/60 group transition-colors"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <BookOpen className="w-3 h-3 text-primary shrink-0" />
                  <span className="text-sm text-foreground truncate">{post.title}</span>
                  {post.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="hidden sm:inline text-[10px] font-mono px-1 py-0.5 rounded bg-secondary text-muted-foreground shrink-0"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => handleUnassign(post.id)}
                  disabled={isPending && pendingId === post.id}
                  className="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-secondary text-muted-foreground hover:text-destructive transition-all"
                  title="Remove from section"
                >
                  {isPending && pendingId === post.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Link2Off className="w-3 h-3" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Divider */}
      {assigned.length > 0 && <div className="border-t border-border/40 mx-3" />}

      {/* Search + suggestions */}
      <div className="px-3 pt-2 pb-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          Add posts
        </p>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border bg-background mb-1.5">
          <Search className="w-3 h-3 text-muted-foreground shrink-0" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search posts by title or tag…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="max-h-40 overflow-y-auto flex flex-col gap-0.5">
          {suggestions.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 text-center">
              {q ? "No matching posts found." : "All posts are already assigned."}
            </p>
          ) : (
            suggestions.map((post) => (
              <div
                key={post.id}
                className="flex items-center justify-between gap-2 px-2 py-1 rounded hover:bg-secondary/60 group transition-colors"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <BookOpen className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="text-sm text-foreground truncate">{post.title}</span>
                  {post.sectionId && (
                    <span className="hidden sm:inline text-[10px] font-mono px-1 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                      in other section
                    </span>
                  )}
                  {post.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="hidden sm:inline text-[10px] font-mono px-1 py-0.5 rounded bg-secondary text-muted-foreground shrink-0"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => handleAssign(post.id)}
                  disabled={isPending && pendingId === post.id}
                  className="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-secondary text-muted-foreground hover:text-primary transition-all"
                  title="Add to this section"
                >
                  {isPending && pendingId === post.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Link2 className="w-3 h-3" />
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ── Section row (recursive) ────────────────────────────────────────────────

interface SectionRowProps {
  node: ApiSectionNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  editingId: string | null;
  addingChildOf: string | null;
  onStartEdit: (id: string) => void;
  onStartAddChild: (id: string) => void;
  onSaveEdit: (id: string, name: string) => void;
  onSaveChild: (parentId: string, name: string) => void;
  onCancelEdit: () => void;
  onDelete: (id: string, name: string) => void;
  isPendingEdit: boolean;
  isPendingChild: boolean;
  // Reordering
  isFirst: boolean;
  isLast: boolean;
  siblings: ApiSectionNode[];
  onMoveSection: (id: string, direction: "up" | "down", siblings: ApiSectionNode[]) => void;
  onReorder: (updates: { id: string; order: number }[]) => Promise<void>;
  isReordering: boolean;
  // Post assignment
  allPosts: ApiPostSummary[];
  assigningPostsOf: string | null;
  onStartAssignPosts: (id: string) => void;
  onAssignPost: (postId: string, sectionId: string) => Promise<void>;
  onUnassignPost: (postId: string) => Promise<void>;
  isPendingAssign: boolean;
}

const SectionRow = ({
  node,
  depth,
  expanded,
  onToggle,
  editingId,
  addingChildOf,
  onStartEdit,
  onStartAddChild,
  onSaveEdit,
  onSaveChild,
  onCancelEdit,
  onDelete,
  isPendingEdit,
  isPendingChild,
  isFirst,
  isLast,
  siblings,
  onMoveSection,
  onReorder,
  isReordering,
  allPosts,
  assigningPostsOf,
  onStartAssignPosts,
  onAssignPost,
  onUnassignPost,
  isPendingAssign,
}: SectionRowProps) => {
  const isExpanded = expanded.has(node.id);
  const hasChildren = (node.children ?? []).length > 0 || addingChildOf === node.id;
  const isEditing = editingId === node.id;
  const isAssigning = assigningPostsOf === node.id;
  const assignedCount = allPosts.filter((p) => p.sectionId === node.id).length;

  return (
    <div>
      <div
        className="group flex items-center gap-1.5 py-1.5 rounded-md hover:bg-secondary/60 transition-colors"
        style={{ paddingLeft: `${8 + depth * 20}px`, paddingRight: "8px" }}
      >
        {/* drag handle */}
        <span className="shrink-0 text-muted-foreground/40 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-3.5 h-3.5" />
        </span>

        {/* expand toggle */}
        <button
          type="button"
          onClick={() => hasChildren && onToggle(node.id)}
          className={`shrink-0 w-4 h-4 flex items-center justify-center text-muted-foreground transition-colors ${hasChildren ? "hover:text-foreground" : "cursor-default"}`}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <span className="w-3.5 h-3.5" />
          )}
        </button>

        {/* folder icon */}
        <span className="text-muted-foreground shrink-0">
          {hasChildren && isExpanded ? (
            <FolderOpen className="w-3.5 h-3.5" />
          ) : (
            <Folder className="w-3.5 h-3.5" />
          )}
        </span>

        {/* name / inline edit */}
        {isEditing ? (
          <div className="flex-1 min-w-0">
            <InlineEditor
              initialName={node.name}
              onSave={(name) => onSaveEdit(node.id, name)}
              onCancel={onCancelEdit}
              isPending={isPendingEdit}
            />
          </div>
        ) : (
          <>
            <span className="flex-1 text-sm text-foreground truncate">{node.name}</span>
            <span className="text-xs text-muted-foreground font-mono opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline">
              /{node.slug}
            </span>

            {/* action buttons – only visible on hover */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              {assignedCount > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary mr-0.5">
                  {assignedCount}
                </span>
              )}
              <button
                type="button"
                onClick={() => onMoveSection(node.id, "up", siblings)}
                disabled={isFirst || isReordering}
                className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                title="Move up"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onMoveSection(node.id, "down", siblings)}
                disabled={isLast || isReordering}
                className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                title="Move down"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onStartAssignPosts(node.id)}
                className={`p-1 rounded hover:bg-secondary transition-colors ${
                  isAssigning ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
                title="Assign posts"
              >
                <BookOpen className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onStartAddChild(node.id)}
                className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                title="Add child section"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onStartEdit(node.id)}
                className="p-1 rounded hover:bg-secondary text-primary transition-colors"
                title="Rename"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(node.id, node.name)}
                className="p-1 rounded hover:bg-secondary text-destructive transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Post assign panel */}
      {isAssigning && (
        <div style={{ paddingLeft: `${8 + (depth + 1) * 20}px`, paddingRight: "8px" }}>
          <PostAssignPanel
            sectionId={node.id}
            allPosts={allPosts}
            onAssign={onAssignPost}
            onUnassign={onUnassignPost}
            isPending={isPendingAssign}
          />
        </div>
      )}

      {/* Children */}
      {isExpanded && (
        <div>
          <DraggableSectionList
            nodes={node.children ?? []}
            depth={depth + 1}
            onReorder={onReorder}
            isReordering={isReordering}
            expanded={expanded}
            onToggle={onToggle}
            editingId={editingId}
            addingChildOf={addingChildOf}
            onStartEdit={onStartEdit}
            onStartAddChild={onStartAddChild}
            onSaveEdit={onSaveEdit}
            onSaveChild={onSaveChild}
            onCancelEdit={onCancelEdit}
            onDelete={onDelete}
            isPendingEdit={isPendingEdit}
            isPendingChild={isPendingChild}
            onMoveSection={onMoveSection}
            allPosts={allPosts}
            assigningPostsOf={assigningPostsOf}
            onStartAssignPosts={onStartAssignPosts}
            onAssignPost={onAssignPost}
            onUnassignPost={onUnassignPost}
            isPendingAssign={isPendingAssign}
          />

          {addingChildOf === node.id && (
            <div
              className="py-1.5 px-2"
              style={{ paddingLeft: `${8 + (depth + 1) * 20}px` }}
            >
              <InlineEditor
                placeholder="New child section name"
                onSave={(name) => onSaveChild(node.id, name)}
                onCancel={onCancelEdit}
                isPending={isPendingChild}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Draggable sibling list ────────────────────────────────────────────────

interface DraggableSectionListProps {
  nodes: ApiSectionNode[];
  depth: number;
  onReorder: (updates: { id: string; order: number }[]) => Promise<void>;
  isReordering: boolean;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  editingId: string | null;
  addingChildOf: string | null;
  onStartEdit: (id: string) => void;
  onStartAddChild: (id: string) => void;
  onSaveEdit: (id: string, name: string) => void;
  onSaveChild: (parentId: string, name: string) => void;
  onCancelEdit: () => void;
  onDelete: (id: string, name: string) => void;
  isPendingEdit: boolean;
  isPendingChild: boolean;
  onMoveSection: (id: string, direction: "up" | "down", siblings: ApiSectionNode[]) => void;
  allPosts: ApiPostSummary[];
  assigningPostsOf: string | null;
  onStartAssignPosts: (id: string) => void;
  onAssignPost: (postId: string, sectionId: string) => Promise<void>;
  onUnassignPost: (postId: string) => Promise<void>;
  isPendingAssign: boolean;
}

const DraggableSectionList = ({
  nodes,
  depth,
  onReorder,
  isReordering,
  ...rowProps
}: DraggableSectionListProps) => {
  const [orderedNodes, setOrderedNodes] = useState<ApiSectionNode[]>(() =>
    [...nodes].sort((a, b) => a.order - b.order)
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [revertError, setRevertError] = useState<string | null>(null);
  const dragIdxRef = useRef<number | null>(null);

  // Sync with server data whenever nodes change (but not mid-drag)
  useEffect(() => {
    if (draggingId === null) {
      setOrderedNodes([...nodes].sort((a, b) => a.order - b.order));
    }
  }, [nodes, draggingId]);

  const handleDragStart = (e: React.DragEvent, id: string, idx: number) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    dragIdxRef.current = idx;
    setRevertError(null);
    setTimeout(() => setDraggingId(id), 0);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragIdxRef.current !== null && dragIdxRef.current !== idx) {
      setDragOverIdx(idx);
    }
  };

  const handleDrop = async (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    const fromIdx = dragIdxRef.current;
    setDraggingId(null);
    setDragOverIdx(null);
    dragIdxRef.current = null;
    if (fromIdx === null || fromIdx === dropIdx) return;

    // Optimistic update — reorder immediately in the UI
    const previous = [...orderedNodes];
    const reordered = [...orderedNodes];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(dropIdx, 0, moved);
    setOrderedNodes(reordered);

    try {
      await onReorder(reordered.map((s, i) => ({ id: s.id, order: i })));
    } catch {
      // Revert to previous order and surface the error
      setOrderedNodes(previous);
      setRevertError("Reorder failed — changes reverted.");
    }
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverIdx(null);
    dragIdxRef.current = null;
  };

  return (
    <>
      {revertError && (
        <div className="mx-2 my-1 px-3 py-1.5 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between gap-2">
          <span>{revertError}</span>
          <button
            type="button"
            onClick={() => setRevertError(null)}
            className="shrink-0 hover:opacity-70 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      {orderedNodes.map((node, i) => (
        <div
          key={node.id}
          draggable={!isReordering}
          onDragStart={(e) => handleDragStart(e, node.id, i)}
          onDragOver={(e) => handleDragOver(e, i)}
          onDrop={(e) => handleDrop(e, i)}
          onDragEnd={handleDragEnd}
          className={[
            draggingId === node.id ? "opacity-40" : "",
            dragOverIdx === i && draggingId !== node.id
              ? "border-t-2 border-primary"
              : "border-t-2 border-transparent",
          ].join(" ")}
        >
          <SectionRow
            node={node}
            depth={depth}
            isFirst={i === 0}
            isLast={i === orderedNodes.length - 1}
            siblings={orderedNodes}
            onReorder={onReorder}
            isReordering={isReordering}
            {...rowProps}
          />
        </div>
      ))}
    </>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────

const AdminSections = () => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingChildOf, setAddingChildOf] = useState<string | null>(null);
  const [addingRoot, setAddingRoot] = useState(false);
  const [assigningPostsOf, setAssigningPostsOf] = useState<string | null>(null);

  const hasToken = !!getToken();
  const { data: authData, isLoading: isVerifying } = useVerifyToken();
  const isAuth = hasToken && authData?.valid;

  const { data: sectionData, isLoading: isLoadingSections } = useSectionTree();
  const { data: postsData } = useAdminPosts({ limit: 100, sort: "createdAt", order: "desc" });
  const logoutMutation = useLogout();
  const createMutation = useCreateSection();
  const updateMutation = useUpdateSection();
  const deleteMutation = useDeleteSection();
  const reorderMutation = useReorderSections();
  const updatePostMutation = useUpdatePost();

  const sections = sectionData?.sections ?? [];
  const allPosts = useMemo(() => postsData?.posts ?? [], [postsData]);

  const handleLogout = () => {
    logoutMutation.mutate();
    navigate("/");
  };

  const handleToggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleStartEdit = (id: string) => {
    setEditingId(id);
    setAddingChildOf(null);
    setAddingRoot(false);
  };

  const handleStartAddChild = (id: string) => {
    setAddingChildOf(id);
    setEditingId(null);
    setAddingRoot(false);
    // auto-expand so the inline editor appears inside the node
    setExpanded((prev) => new Set([...prev, id]));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setAddingChildOf(null);
    setAddingRoot(false);
  };

  const handleStartAssignPosts = (id: string) => {
    setAssigningPostsOf((prev) => (prev === id ? null : id));
    setEditingId(null);
    setAddingChildOf(null);
    setAddingRoot(false);
  };

  const handleAssignPost = async (postId: string, sectionId: string) => {
    await updatePostMutation.mutateAsync({ id: postId, data: { sectionId } });
  };

  const handleUnassignPost = async (postId: string) => {
    await updatePostMutation.mutateAsync({ id: postId, data: { sectionId: null } });
  };

  const handleSaveEdit = async (id: string, name: string) => {
    await updateMutation.mutateAsync({ id, data: { name, slug: slugify(name) } });
    setEditingId(null);
  };

  const handleSaveChild = async (parentId: string, name: string) => {
    await createMutation.mutateAsync({ name, slug: slugify(name), parentId });
    setAddingChildOf(null);
  };

  const handleSaveRoot = async (name: string) => {
    await createMutation.mutateAsync({ name, slug: slugify(name), parentId: null });
    setAddingRoot(false);
  };

  const handleReorderSections = async (updates: { id: string; order: number }[]) => {
    await reorderMutation.mutateAsync({ sections: updates });
  };

  const handleMoveSection = async (id: string, direction: "up" | "down", siblings: ApiSectionNode[]) => {
    const sorted = [...siblings].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((s) => s.id === id);
    if (idx === -1) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === sorted.length - 1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const reordered = [...sorted];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];

    await handleReorderSections(reordered.map((s, i) => ({ id: s.id, order: i })));
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Delete "${name}"? Any child sections will also be removed, and posts in this section will become unsectioned.`)) {
      await deleteMutation.mutateAsync(id);
    }
  };

  // Auth guard
  if (isVerifying && hasToken) {
    return (
      <Layout>
        <section className="min-h-[80vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </section>
      </Layout>
    );
  }

  if (!isAuth) {
    navigate("/manohar");
    return null;
  }

  return (
    <Layout>
      <section className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 pt-6 pb-12">
        <Breadcrumb
          items={[
            { label: "Home", to: "/" },
            { label: "Admin", to: "/manohar" },
            { label: "Sections" },
          ]}
        />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Sections</h1>
            <p className="text-sm text-muted-foreground">
              Organize your posts into nested folders.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Logout</span>
            </button>
            <button
              onClick={() => {
                setAddingRoot(true);
                setEditingId(null);
                setAddingChildOf(null);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">New Section</span>
            </button>
          </div>
        </div>

        {/* Error */}
        {(createMutation.isError || updateMutation.isError || deleteMutation.isError) && (
          <div className="mb-3 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {createMutation.error?.message ||
              updateMutation.error?.message ||
              deleteMutation.error?.message ||
              "Operation failed"}
          </div>
        )}

        {/* Loading */}
        {isLoadingSections && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {/* Content */}
        {!isLoadingSections && (
          <div className="rounded-lg border border-border/40 bg-card p-2 animate-fade-in">
            {/* Add root inline editor */}
            {addingRoot && (
              <div className="px-2 py-1.5 mb-1">
                <InlineEditor
                  placeholder="Top-level section name"
                  onSave={handleSaveRoot}
                  onCancel={handleCancelEdit}
                  isPending={createMutation.isPending}
                />
              </div>
            )}

            {sections.length === 0 && !addingRoot ? (
              <div className="py-10 text-center text-muted-foreground">
                <FolderTree className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No sections yet.</p>
                <p className="text-xs mt-1">
                  Click <strong>New Section</strong> to create your first folder.
                </p>
              </div>
            ) : (
              <DraggableSectionList
                nodes={sections}
                depth={0}
                onReorder={handleReorderSections}
                isReordering={reorderMutation.isPending}
                expanded={expanded}
                onToggle={handleToggle}
                editingId={editingId}
                addingChildOf={addingChildOf}
                onStartEdit={handleStartEdit}
                onStartAddChild={handleStartAddChild}
                onSaveEdit={handleSaveEdit}
                onSaveChild={handleSaveChild}
                onCancelEdit={handleCancelEdit}
                onDelete={handleDelete}
                isPendingEdit={updateMutation.isPending}
                isPendingChild={createMutation.isPending}
                onMoveSection={handleMoveSection}
                allPosts={allPosts}
                assigningPostsOf={assigningPostsOf}
                onStartAssignPosts={handleStartAssignPosts}
                onAssignPost={handleAssignPost}
                onUnassignPost={handleUnassignPost}
                isPendingAssign={updatePostMutation.isPending}
              />
            )}
          </div>
        )}

        {/* Footer tip */}
        <p className="mt-4 text-xs text-muted-foreground text-center">
          Hover over any section to rename, add children, or delete it.
        </p>
      </section>
    </Layout>
  );
};

export default AdminSections;
