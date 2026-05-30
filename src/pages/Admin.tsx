import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import Layout from "@/components/Layout";
import Breadcrumb from "@/components/Breadcrumb";
import TagInput from "@/components/TagInput";
import SectionTreeDropdown from "@/components/SectionTreeDropdown";
import { Pencil, Trash2, Plus, Save, Eye, Code, LogOut, Loader2, Globe, FileText, FolderTree, ImagePlus, ChevronUp, ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import {
  useLogin,
  useVerifyToken,
  useLogout,
  useAdminPosts,
  useCreatePost,
  useUpdatePost,
  useDeletePost,
  usePublishPost,
  useUnpublishPost,
  useUploadImage,
  useReorderPosts,
  useSectionTree,
} from "@/hooks/use-api";
import { isAuthenticated, getToken, api } from "@/lib/api";
import type { ApiPost, CreatePostRequest, UpdatePostRequest } from "@/lib/api";

type View = "list" | "edit";

interface EditablePost {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  tags: string[];
  coverImage: string;
  status: "DRAFT" | "PUBLISHED";
  readingTime: number;
  sectionId: string | null;
  order: number;
}

const Admin = () => {
  const navigate = useNavigate();
  const [editingPost, setEditingPost] = useState<EditablePost | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [view, setView] = useState<View>("list");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [adminPage, setAdminPage] = useState(0);
  const POSTS_PER_PAGE = 15;
  const contentTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Auth state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  
  // Queries and mutations
  const { data: authData, isLoading: isVerifying, error: authError } = useVerifyToken();
  const loginMutation = useLogin();
  const logoutMutation = useLogout();
  const { data: postsData, isLoading: isLoadingPosts } = useAdminPosts({
    limit: POSTS_PER_PAGE,
    offset: adminPage * POSTS_PER_PAGE,
    sort: "createdAt",
    order: "desc",
  });
  const createMutation = useCreatePost();
  const updateMutation = useUpdatePost();
  const deleteMutation = useDeletePost();
  const publishMutation = usePublishPost();
  const unpublishMutation = useUnpublishPost();
  const uploadImageMutation = useUploadImage();
  const reorderMutation = useReorderPosts();
  const { data: sectionData, isLoading: isLoadingSections } = useSectionTree();
  const sections = sectionData?.sections ?? [];

  // Check if user is authenticated
  const hasToken = !!getToken();
  const isAuth = hasToken && authData?.valid;

  useEffect(() => {
    if (!isVerifying) {
      setAuthChecked(true);
    }
  }, [isVerifying]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginMutation.mutateAsync({ username, password });
      setPassword("");
      setUsername("");
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleLogout = () => {
    logoutMutation.mutate();
    navigate("/");
  };

  // Show loading while checking auth
  if (!authChecked && hasToken) {
    return (
      <Layout>
        <section className="min-h-[80vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </section>
      </Layout>
    );
  }

  // Login form
  if (!isAuth) {
    return (
      <Layout>
        <section className="min-h-[70vh] sm:min-h-[80vh] flex items-center justify-center px-4 sm:px-6 md:px-8 lg:px-12">
          <div className="w-full max-w-sm animate-fade-in">
            <div className="p-4 sm:p-6 rounded-lg border border-border/40 bg-card">
              <h1 className="text-lg sm:text-xl font-bold text-foreground mb-1">Admin Login</h1>
              <p className="text-sm text-muted-foreground mb-4">
                Enter credentials to access the admin panel.
              </p>
              <form onSubmit={handleLogin} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                    placeholder="Enter username"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                    placeholder="Enter password"
                  />
                </div>
                {loginMutation.isError && (
                  <p className="text-sm text-destructive">
                    {loginMutation.error?.message || "Invalid credentials"}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loginMutation.isPending}
                  className="w-full px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loginMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Login
                </button>
              </form>
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  const allPosts = postsData?.posts || [];
  
  // Deduplicate posts by ID to prevent showing duplicates
  const posts = allPosts.filter((post, index, array) => 
    array.findIndex(p => p.id === post.id) === index
  );

  const emptyPost: EditablePost = {
    slug: "",
    title: "",
    excerpt: "",
    content: "",
    tags: [],
    coverImage: "",
    status: "DRAFT",
    readingTime: 5,
    sectionId: null,
    order: 0,
  };

  const handleEdit = async (post: ApiPost | typeof posts[number]) => {
    setIsCreating(false);
    setShowPreview(false);
    setView("edit");
    // Populate with what we have immediately so the form opens
    setEditingPost({
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      content: "content" in post ? post.content : "",
      tags: post.tags,
      coverImage: post.coverImage || "",
      status: "status" in post ? (post.status as "DRAFT" | "PUBLISHED") : "DRAFT",
      readingTime: post.readingTime,
      sectionId: (post as any).sectionId ?? null,
      order: post.order ?? 0,
    });
    // If the list entry lacks content (ApiPostSummary), fetch the full post
    if (!("content" in post)) {
      const fullPost = await api.getAdminPostById(post.id);
      setEditingPost({
        id: fullPost.id,
        slug: fullPost.slug,
        title: fullPost.title,
        excerpt: fullPost.excerpt,
        content: fullPost.content,
        tags: fullPost.tags,
        coverImage: fullPost.coverImage || "",
        status: fullPost.status,
        readingTime: fullPost.readingTime,
        sectionId: fullPost.sectionId ?? null,
        order: fullPost.order ?? 0,
      });
    }
  };

  const handleCreate = () => {
    setEditingPost({ ...emptyPost, order: 0 });
    setIsCreating(true);
    setShowPreview(false);
    setView("edit");
  };

  const handleSave = async () => {
    if (!editingPost) return;

    try {
      if (isCreating) {
        const createData: CreatePostRequest = {
          title: editingPost.title,
          slug: editingPost.slug || undefined,
          excerpt: editingPost.excerpt,
          content: editingPost.content,
          tags: editingPost.tags,
          coverImage: editingPost.coverImage || null,
          status: editingPost.status,
          sectionId: editingPost.sectionId || null,
          order: editingPost.order,
        };
        await createMutation.mutateAsync(createData);
      } else if (editingPost.id) {
        const updateData: UpdatePostRequest = {
          title: editingPost.title,
          slug: editingPost.slug,
          excerpt: editingPost.excerpt,
          content: editingPost.content,
          tags: editingPost.tags,
          coverImage: editingPost.coverImage || null,
          status: editingPost.status,
          sectionId: editingPost.sectionId,
          order: editingPost.order,
        };
        await updateMutation.mutateAsync({ id: editingPost.id, data: updateData });
      }
      setEditingPost(null);
      setIsCreating(false);
      setShowPreview(false);
      setView("list");
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this post?")) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (error) {
        // Error handled by mutation
      }
    }
  };

  const handleTogglePublish = async (post: typeof posts[number]) => {
    try {
      const status = "status" in post ? post.status : "DRAFT";
      if (status === "PUBLISHED") {
        await unpublishMutation.mutateAsync(post.id);
      } else {
        await publishMutation.mutateAsync(post.id);
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleBack = () => {
    setEditingPost(null);
    setIsCreating(false);
    setShowPreview(false);
    setUploadError(null);
    setView("list");
  };

  const updateField = (field: keyof EditablePost, value: any) => {
    if (editingPost) {
      setEditingPost({ ...editingPost, [field]: value });
    }
  };

  const insertIntoContentAtCursor = (textToInsert: string) => {
    if (!editingPost) return;

    const textarea = contentTextareaRef.current;
    const value = editingPost.content;

    if (!textarea) {
      updateField("content", `${value}${value.endsWith("\n") ? "" : "\n"}${textToInsert}`);
      return;
    }

    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? value.length;
    const nextValue = `${value.slice(0, start)}${textToInsert}${value.slice(end)}`;
    updateField("content", nextValue);

    requestAnimationFrame(() => {
      const position = start + textToInsert.length;
      textarea.focus();
      textarea.setSelectionRange(position, position);
    });
  };

  const handleImagePick = () => {
    setUploadError(null);
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please select a valid image file.");
      return;
    }

    try {
      setUploadError(null);
      const uploaded = await uploadImageMutation.mutateAsync(file);
      const altText = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "image";
      const markdown = `\n![${altText}](${uploaded.url})\n`;
      insertIntoContentAtCursor(markdown);
    } catch (error) {
      setUploadError(
        uploadImageMutation.error?.message || "Image upload failed. Please try again."
      );
    }
  };

  const getSectionKey = (post: { sectionId?: string | null; section?: { id: string } | null }) =>
    post.sectionId ?? post.section?.id ?? null;

  const handleMovePost = async (postId: string, direction: "up" | "down") => {
    const targetPost = posts.find((p) => p.id === postId);
    if (!targetPost) return;

    const targetSectionKey = getSectionKey(targetPost);
    const siblings = posts.filter((p) => getSectionKey(p) === targetSectionKey);
    const sorted = [...siblings].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const idx = sorted.findIndex((p) => p.id === postId);
    if (idx === -1) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === sorted.length - 1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const reordered = [...sorted];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];

    const updates = reordered.map((p, i) => ({ id: p.id, order: i }));
    await reorderMutation.mutateAsync({ posts: updates });
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ─── Edit / Create View ────────────────────────────────────────
  if (view === "edit" && editingPost) {
    const breadcrumbLabel = isCreating ? "New Post" : editingPost.title || "Edit Post";
    return (
      <Layout>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 pt-6 pb-12">
          <Breadcrumb
            items={[
              { label: "Home", to: "/" },
              { label: "Admin", onClick: handleBack },
              { label: breadcrumbLabel },
            ]}
          />

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-3 animate-fade-in">
            <h1 className="text-lg sm:text-xl font-bold text-foreground">
              {isCreating ? "New Post" : "Edit Post"}
            </h1>
            <div className="flex gap-1.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground text-sm hover:opacity-80 transition-opacity"
              >
                {showPreview ? <Code className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span className="hidden xs:inline">{showPreview ? "Editor" : "Preview"}</span>
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span className="hidden xs:inline">Save</span>
              </button>
              <button
                onClick={handleBack}
                className="px-3 py-1.5 rounded-md border border-border/40 text-foreground text-sm hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Error display */}
          {(createMutation.isError || updateMutation.isError) && (
            <div className="mb-3 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {createMutation.error?.message || updateMutation.error?.message || "Failed to save post"}
            </div>
          )}

          {/* Fields */}
          <div className="space-y-3 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Slug</label>
                <input
                  type="text"
                  value={editingPost.slug}
                  onChange={(e) => updateField("slug", e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                  placeholder="my-new-post (auto-generated if empty)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Title</label>
                <input
                  type="text"
                  value={editingPost.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                  placeholder="Building Resilient Distributed Systems"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Excerpt</label>
              <textarea
                value={editingPost.excerpt}
                onChange={(e) => updateField("excerpt", e.target.value)}
                rows={2}
                className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow resize-none"
                placeholder="A brief description of your post..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Section
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">(optional)</span>
              </label>
              <SectionTreeDropdown
                sections={sections}
                selectedId={editingPost.sectionId}
                onChange={(id) => updateField("sectionId", id)}
                isLoading={isLoadingSections}
              />
            </div>

            {/* Content + Live Preview */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Content (Markdown)
              </label>
              <div className="mb-2 flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <button
                  type="button"
                  onClick={handleImagePick}
                  disabled={uploadImageMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border/60 text-xs text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
                >
                  {uploadImageMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ImagePlus className="w-3.5 h-3.5" />
                  )}
                  Upload image
                </button>
                <span className="text-xs text-muted-foreground">
                  Inserts `![alt](url)` into markdown.
                </span>
              </div>
              {uploadError && (
                <p className="mb-2 text-xs text-destructive">{uploadError}</p>
              )}
              {showPreview ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <textarea
                      ref={contentTextareaRef}
                      value={editingPost.content}
                      onChange={(e) => updateField("content", e.target.value)}
                      className="w-full h-[320px] sm:h-[400px] px-3 py-2 rounded-md bg-background border border-border text-foreground font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary transition-shadow resize-none"
                      placeholder={"# Heading\n\nWrite your post in **Markdown**..."}
                    />
                  </div>
                  <div>
                    <div className="h-[320px] sm:h-[400px] px-4 py-3 rounded-md bg-background border border-border overflow-auto">
                      <article className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:text-sm prose-p:leading-relaxed prose-a:text-primary prose-strong:text-foreground prose-code:text-sm prose-pre:text-sm prose-li:text-sm">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                          {editingPost.content || "*Start writing to see preview...*"}
                        </ReactMarkdown>
                      </article>
                    </div>
                  </div>
                </div>
              ) : (
                <textarea
                  ref={contentTextareaRef}
                  value={editingPost.content}
                  onChange={(e) => updateField("content", e.target.value)}
                  className="w-full h-[320px] sm:h-[400px] px-3 py-2 rounded-md bg-background border border-border text-foreground font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary transition-shadow resize-none"
                  placeholder={"# Heading\n\nWrite your post in **Markdown**..."}
                />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-1">Tags</label>
                <TagInput
                  tags={editingPost.tags}
                  onChange={(newTags) => updateField("tags", newTags)}
                  placeholder="Add tags (press Enter to add)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Status</label>
                <select
                  value={editingPost.status}
                  onChange={(e) => updateField("status", e.target.value as "DRAFT" | "PUBLISHED")}
                  className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Read time</label>
                <input
                  type="number"
                  value={editingPost.readingTime}
                  onChange={(e) => updateField("readingTime", parseInt(e.target.value) || 5)}
                  className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                  min="1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Order
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">(display position)</span>
                </label>
                <input
                  type="number"
                  value={editingPost.order}
                  onChange={(e) => updateField("order", parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Cover URL</label>
              <input
                type="text"
                value={editingPost.coverImage}
                onChange={(e) => updateField("coverImage", e.target.value)}
                className="w-full px-3 py-1.5 rounded-md bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                placeholder="https://..."
              />
            </div>
          </div>
        </section>
      </Layout>
    );
  }

  // ─── Posts List View ───────────────────────────────────────────
  return (
    <Layout>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 pt-6 pb-12">
        <Breadcrumb items={[{ label: "Home", to: "/" }, { label: "Admin" }]} />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 animate-fade-in">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Admin</h1>
            <p className="text-sm text-muted-foreground">
              Manage your blog posts.
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
            <Link
              to="/manohar/sections"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border border-border/40 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Sections</span>
            </Link>
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">New Post</span>
            </button>
          </div>
        </div>

        {/* Loading state */}
        {isLoadingPosts && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {/* Posts list */}
        {!isLoadingPosts && (
          <div className="animate-fade-in">
            {posts.length === 0 && adminPage === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No posts yet. Create your first post!</p>
              </div>
            ) : (() => {
              // Precompute first/last position per section so up/down buttons are correct
              const sectionPositions = new Map<string, { isFirst: boolean; isLast: boolean }>();
              const sectionGroups = new Map<string | null, typeof posts>();
              for (const p of posts) {
                const key = getSectionKey(p);
                if (!sectionGroups.has(key)) sectionGroups.set(key, []);
                sectionGroups.get(key)!.push(p);
              }
              for (const group of sectionGroups.values()) {
                const sorted = [...group].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                sorted.forEach((p, i) => {
                  sectionPositions.set(p.id, { isFirst: i === 0, isLast: i === sorted.length - 1 });
                });
              }

              return [...posts]
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map((post, i) => {
                const status = "status" in post ? post.status : "DRAFT";
                const { isFirst, isLast } = sectionPositions.get(post.id) ?? { isFirst: true, isLast: true };
                const isReordering = reorderMutation.isPending;
                return (
                  <div
                    key={post.id}
                    className="group py-4 border-b border-border/40 last:border-0 animate-fade-in"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[11px] font-mono text-muted-foreground shrink-0 tabular-nums">
                            #{post.order ?? 0}
                          </span>
                          <h3 className="text-sm sm:text-base font-medium text-foreground truncate">
                            {post.title}
                          </h3>
                          <span
                            className={`text-[11px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                              status === "PUBLISHED"
                                ? "bg-primary/20 text-primary"
                                : "bg-secondary text-muted-foreground"
                            }`}
                          >
                            {status.toLowerCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 text-xs text-muted-foreground">
                          <span className="hidden sm:inline">
                            {new Date(post.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <span className="hidden sm:inline">·</span>
                          <span>{post.readingTime}m</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Reorder buttons */}
                        <button
                          onClick={() => handleMovePost(post.id, "up")}
                          disabled={isFirst || isReordering}
                          className="p-1.5 rounded-md hover:bg-secondary transition-colors disabled:opacity-30"
                          title="Move up"
                        >
                          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => handleMovePost(post.id, "down")}
                          disabled={isLast || isReordering}
                          className="p-1.5 rounded-md hover:bg-secondary transition-colors disabled:opacity-30"
                          title="Move down"
                        >
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => handleTogglePublish(post)}
                          disabled={publishMutation.isPending || unpublishMutation.isPending}
                          className="p-1.5 rounded-md hover:bg-secondary transition-colors disabled:opacity-50"
                          title={status === "PUBLISHED" ? "Unpublish" : "Publish"}
                        >
                          <Globe className={`w-3.5 h-3.5 ${status === "PUBLISHED" ? "text-primary" : "text-muted-foreground"}`} />
                        </button>
                        <button
                          onClick={() => handleEdit(post as any)}
                          className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5 text-primary" />
                        </button>
                        <button
                          onClick={() => handleDelete(post.id)}
                          disabled={deleteMutation.isPending}
                          className="p-1.5 rounded-md hover:bg-secondary transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-1 mt-1.5">
                      {post.excerpt}
                    </p>

                    <div className="flex items-center gap-1.5 mt-2">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              });
            })()}

            {/* Pagination controls */}
            {postsData && postsData.pagination.total > POSTS_PER_PAGE && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/40">
                <button
                  onClick={() => setAdminPage((p) => Math.max(0, p - 1))}
                  disabled={adminPage === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border/40 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-30"
                >
                  ← Previous
                </button>
                <span className="text-sm text-muted-foreground tabular-nums">
                  Page {adminPage + 1} of {Math.ceil(postsData.pagination.total / POSTS_PER_PAGE)}
                  <span className="ml-2 text-xs opacity-60">({postsData.pagination.total} posts)</span>
                </span>
                <button
                  onClick={() => setAdminPage((p) => p + 1)}
                  disabled={!postsData.pagination.hasMore}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border/40 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-30"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </Layout>
  );
};

export default Admin;
