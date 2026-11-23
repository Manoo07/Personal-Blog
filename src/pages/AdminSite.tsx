import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowDown, ArrowUp, ArrowLeft, Check, ExternalLink, Globe, GraduationCap, Home, ImagePlus,
  Link2, Loader2, Plus, RotateCcw, Briefcase, Trash2, User, Wrench, FileText,
} from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import TagInput from "@/components/TagInput";
import { useVerifyToken, useUploadImage } from "@/hooks/use-api";
import { useSiteConfigStatus, useUpdateSiteConfig } from "@/hooks/use-site-config";
import { getToken } from "@/lib/api";
import { prepareImageForUpload, ALLOWED_IMAGE_TYPES } from "@/lib/image-upload";
import {
  DEFAULT_SITE_CONFIG, mergeWithDefaults,
  type SiteConfig, type SocialKind, type ExperienceItem, type EducationItem, type SkillGroup, type SocialLink,
} from "@/lib/site-config";
import { getAssetPath } from "@/lib/assets";
import { cn } from "@/lib/utils";

/**
 * /manohar/site — edit everything on the site that isn't a blog post:
 * profile, home hero, about/bio, experience, education, skills, links, site chrome.
 * Laid out like Obsidian's settings: a section list on the left, form on the right.
 */

type TabKey = "profile" | "home" | "about" | "experience" | "education" | "skills" | "links" | "site";

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }>; hint: string }[] = [
  { key: "profile", label: "Profile", icon: User, hint: "Your name, headline and photo" },
  { key: "home", label: "Home page", icon: Home, hint: "Hero text and section titles" },
  { key: "about", label: "About & bio", icon: FileText, hint: "Bio and contact blurb on the About page" },
  { key: "experience", label: "Experience", icon: Briefcase, hint: "Jobs and internships, newest first" },
  { key: "education", label: "Education", icon: GraduationCap, hint: "Degrees and schools" },
  { key: "skills", label: "Skills", icon: Wrench, hint: "Grouped skill chips" },
  { key: "links", label: "Links", icon: Link2, hint: "Social links in the header, footer and About page" },
  { key: "site", label: "Site", icon: Globe, hint: "Logo text, library name, footer, GitHub" },
];

const SOCIAL_KINDS: { value: SocialKind; label: string }[] = [
  { value: "github", label: "GitHub" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "x", label: "X / Twitter" },
  { value: "email", label: "Email" },
  { value: "website", label: "Website" },
  { value: "youtube", label: "YouTube" },
  { value: "other", label: "Other" },
];

// ── Small form primitives (Obsidian setting-item look) ─────────────────────

const inputCls =
  "w-full px-3 py-1.5 rounded-[5px] bg-[hsl(0_0%_97%)] border border-border text-[14px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-input focus:ring-2 focus:ring-input/20 transition-shadow";

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="py-3 border-b border-border/70 last:border-0 grid gap-1.5 sm:grid-cols-[200px_1fr] sm:gap-6">
    <div>
      <div className="text-[14px] font-medium text-foreground">{label}</div>
      {hint && <div className="text-[12.5px] text-muted-foreground leading-snug mt-0.5">{hint}</div>}
    </div>
    <div className="min-w-0">{children}</div>
  </div>
);

const Text = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <input className={inputCls} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
);

const Area = ({ value, onChange, rows = 5, placeholder }: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) => (
  <textarea
    className={cn(inputCls, "leading-relaxed resize-y min-h-[80px]")}
    rows={rows}
    value={value}
    placeholder={placeholder}
    onChange={(e) => onChange(e.target.value)}
  />
);

const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={cn("relative w-9 h-5 rounded-full transition-colors", checked ? "bg-primary" : "bg-secondary-alt")}
  >
    <span className={cn("absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform", checked && "translate-x-4")} />
  </button>
);

/** Card wrapper for one entry in a repeatable list, with move/remove controls. */
function ListCard({
  title, index, count, onMove, onRemove, children,
}: {
  title: string; index: number; count: number;
  onMove: (from: number, to: number) => void; onRemove: () => void; children: React.ReactNode;
}) {
  const btn = "p-1.5 rounded-[4px] text-muted-foreground hover:text-foreground hover:bg-accent/60 disabled:opacity-30 disabled:pointer-events-none";
  return (
    <div className="rounded-[8px] border border-border bg-[hsl(0_0%_93%)]">
      <div className="flex items-center gap-1 pl-3 pr-1.5 h-10 border-b border-border/70">
        <span className="flex-1 truncate text-[13.5px] font-medium text-foreground">{title || "Untitled"}</span>
        <button type="button" className={btn} disabled={index === 0} onClick={() => onMove(index, index - 1)} title="Move up" aria-label="Move up">
          <ArrowUp className="w-4 h-4" />
        </button>
        <button type="button" className={btn} disabled={index === count - 1} onClick={() => onMove(index, index + 1)} title="Move down" aria-label="Move down">
          <ArrowDown className="w-4 h-4" />
        </button>
        <button type="button" className={cn(btn, "hover:text-destructive")} onClick={onRemove} title="Remove" aria-label="Remove">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="px-3 pb-1">{children}</div>
    </div>
  );
}

const AddButton = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center justify-center gap-1.5 h-10 rounded-[8px] border border-dashed border-secondary-alt text-[13.5px] text-muted-foreground hover:text-foreground hover:border-primary/60 hover:bg-accent/30 transition-colors"
  >
    <Plus className="w-4 h-4" /> {children}
  </button>
);

function move<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// ── Page ───────────────────────────────────────────────────────────────────

const AdminSite = () => {
  const navigate = useNavigate();
  const hasToken = !!getToken();
  const { data: authData, isLoading: isVerifying } = useVerifyToken();
  const status = useSiteConfigStatus();
  const save = useUpdateSiteConfig();
  const uploadImage = useUploadImage();

  const [tab, setTab] = useState<TabKey>("profile");
  const [draft, setDraft] = useState<SiteConfig | null>(null);
  const [saved, setSaved] = useState<SiteConfig | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);

  // Admin-only
  useEffect(() => {
    if (!hasToken || (!isVerifying && !authData?.valid)) navigate("/manohar");
  }, [hasToken, isVerifying, authData, navigate]);

  // Load server copy once
  useEffect(() => {
    if (status.data && draft === null) {
      const merged = mergeWithDefaults(status.data.config);
      setDraft(merged);
      setSaved(merged);
    }
  }, [status.data, draft]);

  const dirty = useMemo(() => !!draft && !!saved && JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved]);

  // Warn before leaving with unsaved edits
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // ⌘S / Ctrl+S saves
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirty) handleSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!draft || isVerifying || status.isLoading) {
    return (
      <Layout>
        <section className="min-h-[70vh] flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
          {status.isError ? (
            <>
              <p>Couldn't load site content: {(status.error as Error)?.message}</p>
              <p className="text-xs">Is the backend deployed with the <code>/api/site</code> route?</p>
            </>
          ) : (
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          )}
        </section>
      </Layout>
    );
  }

  // Typed updaters
  const set = <K extends keyof SiteConfig>(key: K, value: SiteConfig[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d));
  const setProfile = (patch: Partial<SiteConfig["profile"]>) => set("profile", { ...draft.profile, ...patch });
  const setHome = (patch: Partial<SiteConfig["home"]>) => set("home", { ...draft.home, ...patch });
  const setAbout = (patch: Partial<SiteConfig["about"]>) => set("about", { ...draft.about, ...patch });
  const setSite = (patch: Partial<SiteConfig["site"]>) => set("site", { ...draft.site, ...patch });

  const setExperience = (items: ExperienceItem[]) => setAbout({ experience: items });
  const setEducation = (items: EducationItem[]) => setAbout({ education: items });
  const setSkills = (items: SkillGroup[]) => setAbout({ skillGroups: items });
  const setLinks = (items: SocialLink[]) => set("links", items);

  async function handleSave() {
    if (!draft) return;
    const bad = draft.links.find((l) => l.url && !/^(https?:|mailto:)/i.test(l.url.trim()));
    if (bad) {
      setTab("links");
      toast.error(`"${bad.label || "Link"}" must start with https://, http:// or mailto:`);
      return;
    }
    try {
      await save.mutateAsync(draft);
      setSaved(draft);
      toast.success("Site content saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
  }

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const ready = await prepareImageForUpload(file);
      const { url } = await uploadImage.mutateAsync(ready);
      setProfile({ avatarUrl: url });
      toast.success("Photo uploaded — save to publish it");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const activeTab = TABS.find((t) => t.key === tab)!;

  return (
    <Layout hideFooter>
      <div className="min-h-[calc(100vh-49px)] flex flex-col md:flex-row">
        {/* Settings nav */}
        <aside className="md:w-[240px] shrink-0 bg-secondary border-b md:border-b-0 md:border-r border-border md:sticky md:top-[49px] md:h-[calc(100vh-49px)] flex flex-col">
          <div className="px-3 pt-3 pb-2">
            <Link to="/manohar" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-3.5 h-3.5" /> Posts
            </Link>
            <h1 className="mt-2 px-1 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Site content</h1>
          </div>
          <nav className="px-2 pb-3 flex md:flex-col gap-0.5 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "shrink-0 flex items-center gap-2 h-8 px-2.5 rounded-[5px] text-[13.5px] text-left transition-colors",
                  tab === t.key ? "bg-accent text-foreground font-medium" : "text-foreground/80 hover:bg-accent/60"
                )}
              >
                <t.icon className="w-4 h-4 text-muted-foreground" />
                {t.label}
              </button>
            ))}
          </nav>
          <div className="mt-auto hidden md:block p-3 border-t border-border text-[12px] text-muted-foreground leading-snug">
            {status.data?.updatedAt
              ? `Last saved ${new Date(status.data.updatedAt).toLocaleString()}`
              : "Not saved yet — the site is showing the built-in defaults."}
          </div>
        </aside>

        {/* Form */}
        <main className="flex-1 min-w-0 pb-24">
          <div className="max-w-[820px] mx-auto px-5 sm:px-8 pt-6">
            <div className="mb-3">
              <h2 className="text-[22px] font-semibold text-foreground">{activeTab.label}</h2>
              <p className="text-[13.5px] text-muted-foreground">{activeTab.hint}</p>
            </div>

            {tab === "profile" && (
              <div>
                <Field label="Photo" hint="Shown on the home page. PNG, JPEG, WebP or AVIF; large images are compressed.">
                  <div className="flex items-center gap-3">
                    <img
                      src={draft.profile.avatarUrl || getAssetPath("image.png")}
                      alt=""
                      className="w-16 h-16 rounded-[8px] object-cover border border-border bg-secondary"
                    />
                    <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                      <div className="flex gap-2">
                        <input ref={avatarInput} type="file" accept={ALLOWED_IMAGE_TYPES.join(",")} className="hidden" onChange={handleAvatar} />
                        <button
                          type="button"
                          onClick={() => avatarInput.current?.click()}
                          disabled={uploadingAvatar}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[5px] border border-border bg-[hsl(0_0%_97%)] text-[13px] hover:bg-white disabled:opacity-50"
                        >
                          {uploadingAvatar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                          Upload photo
                        </button>
                        {draft.profile.avatarUrl && (
                          <button type="button" onClick={() => setProfile({ avatarUrl: "" })} className="h-8 px-3 rounded-[5px] text-[13px] text-muted-foreground hover:text-foreground hover:bg-accent/60">
                            Use default
                          </button>
                        )}
                      </div>
                      <Text value={draft.profile.avatarUrl} onChange={(v) => setProfile({ avatarUrl: v })} placeholder="…or paste an image URL" />
                    </div>
                  </div>
                </Field>
                <Field label="Name"><Text value={draft.profile.name} onChange={(v) => setProfile({ name: v })} /></Field>
                <Field label="Title" hint="Second line of the home hero"><Text value={draft.profile.title} onChange={(v) => setProfile({ title: v })} /></Field>
                <Field label="Headline" hint="One line under your name on About"><Text value={draft.profile.headline} onChange={(v) => setProfile({ headline: v })} /></Field>
                <Field label="Pronouns"><Text value={draft.profile.pronouns} onChange={(v) => setProfile({ pronouns: v })} /></Field>
                <Field label="Location"><Text value={draft.profile.location} onChange={(v) => setProfile({ location: v })} /></Field>
              </div>
            )}

            {tab === "home" && (
              <div>
                <Field label="Greeting" hint="Small line above your name"><Text value={draft.home.greeting} onChange={(v) => setHome({ greeting: v })} /></Field>
                <Field label="Intro" hint="Markdown. Blank lines start new paragraphs."><Area rows={8} value={draft.home.intro} onChange={(v) => setHome({ intro: v })} /></Field>
                <Field label="Primary button"><Text value={draft.home.primaryCta} onChange={(v) => setHome({ primaryCta: v })} /></Field>
                <Field label="Secondary button"><Text value={draft.home.secondaryCta} onChange={(v) => setHome({ secondaryCta: v })} /></Field>
                <Field label="Recent posts title"><Text value={draft.home.recentPostsTitle} onChange={(v) => setHome({ recentPostsTitle: v })} /></Field>
                <Field label="Projects title"><Text value={draft.home.projectsTitle} onChange={(v) => setHome({ projectsTitle: v })} /></Field>
              </div>
            )}

            {tab === "about" && (
              <div>
                <Field label="Bio" hint="Markdown: **bold**, [links](https://…), blank line = new paragraph."><Area rows={12} value={draft.about.bio} onChange={(v) => setAbout({ bio: v })} /></Field>
                <Field label="Contact blurb" hint="Text in the “Get in touch” box"><Area rows={3} value={draft.about.contactBlurb} onChange={(v) => setAbout({ contactBlurb: v })} /></Field>
              </div>
            )}

            {tab === "experience" && (
              <div className="space-y-3 pt-2">
                {draft.about.experience.map((job, i) => {
                  const update = (patch: Partial<ExperienceItem>) =>
                    setExperience(draft.about.experience.map((j, k) => (k === i ? { ...j, ...patch } : j)));
                  return (
                    <ListCard
                      key={i} index={i} count={draft.about.experience.length}
                      title={[job.role, job.company].filter(Boolean).join(" @ ")}
                      onMove={(f, t) => setExperience(move(draft.about.experience, f, t))}
                      onRemove={() => setExperience(draft.about.experience.filter((_, k) => k !== i))}
                    >
                      <Field label="Role"><Text value={job.role} onChange={(v) => update({ role: v })} /></Field>
                      <Field label="Company"><Text value={job.company} onChange={(v) => update({ company: v })} /></Field>
                      <Field label="Period" hint="e.g. Jan 2025 — Present"><Text value={job.period} onChange={(v) => update({ period: v })} /></Field>
                      <Field label="Type" hint="e.g. Full-time · 1 yr 2 mos"><Text value={job.type} onChange={(v) => update({ type: v })} /></Field>
                      <Field label="Description" hint="Markdown"><Area rows={4} value={job.description} onChange={(v) => update({ description: v })} /></Field>
                      <Field label="Skills" hint="Enter or comma to add"><TagInput tags={job.skills} onChange={(v) => update({ skills: v })} placeholder="Add a skill…" /></Field>
                    </ListCard>
                  );
                })}
                <AddButton onClick={() => setExperience([{ role: "", company: "", period: "", type: "", description: "", skills: [] }, ...draft.about.experience])}>
                  Add experience (top)
                </AddButton>
              </div>
            )}

            {tab === "education" && (
              <div className="space-y-3 pt-2">
                {draft.about.education.map((edu, i) => {
                  const update = (patch: Partial<EducationItem>) =>
                    setEducation(draft.about.education.map((e, k) => (k === i ? { ...e, ...patch } : e)));
                  return (
                    <ListCard
                      key={i} index={i} count={draft.about.education.length} title={edu.degree}
                      onMove={(f, t) => setEducation(move(draft.about.education, f, t))}
                      onRemove={() => setEducation(draft.about.education.filter((_, k) => k !== i))}
                    >
                      <Field label="Degree"><Text value={edu.degree} onChange={(v) => update({ degree: v })} /></Field>
                      <Field label="Field"><Text value={edu.field} onChange={(v) => update({ field: v })} /></Field>
                      <Field label="School"><Text value={edu.school} onChange={(v) => update({ school: v })} /></Field>
                      <Field label="Period"><Text value={edu.period} onChange={(v) => update({ period: v })} /></Field>
                    </ListCard>
                  );
                })}
                <AddButton onClick={() => setEducation([...draft.about.education, { degree: "", field: "", school: "", period: "" }])}>
                  Add education
                </AddButton>
              </div>
            )}

            {tab === "skills" && (
              <div className="space-y-3 pt-2">
                {draft.about.skillGroups.map((group, i) => {
                  const update = (patch: Partial<SkillGroup>) =>
                    setSkills(draft.about.skillGroups.map((g, k) => (k === i ? { ...g, ...patch } : g)));
                  return (
                    <ListCard
                      key={i} index={i} count={draft.about.skillGroups.length} title={group.title}
                      onMove={(f, t) => setSkills(move(draft.about.skillGroups, f, t))}
                      onRemove={() => setSkills(draft.about.skillGroups.filter((_, k) => k !== i))}
                    >
                      <Field label="Group name"><Text value={group.title} onChange={(v) => update({ title: v })} /></Field>
                      <Field label="Highlight" hint="Show these chips in the accent colour">
                        <Toggle label="Highlight group" checked={group.emphasis} onChange={(v) => update({ emphasis: v })} />
                      </Field>
                      <Field label="Skills" hint="Enter or comma to add"><TagInput tags={group.items} onChange={(v) => update({ items: v })} placeholder="Add a skill…" /></Field>
                    </ListCard>
                  );
                })}
                <AddButton onClick={() => setSkills([...draft.about.skillGroups, { title: "", emphasis: false, items: [] }])}>
                  Add skill group
                </AddButton>
              </div>
            )}

            {tab === "links" && (
              <div className="space-y-3 pt-2">
                {draft.links.map((link, i) => {
                  const update = (patch: Partial<SocialLink>) => setLinks(draft.links.map((l, k) => (k === i ? { ...l, ...patch } : l)));
                  return (
                    <ListCard
                      key={i} index={i} count={draft.links.length} title={link.label}
                      onMove={(f, t) => setLinks(move(draft.links, f, t))}
                      onRemove={() => setLinks(draft.links.filter((_, k) => k !== i))}
                    >
                      <Field label="Type">
                        <select className={inputCls} value={link.kind} onChange={(e) => update({ kind: e.target.value as SocialKind })}>
                          {SOCIAL_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                        </select>
                      </Field>
                      <Field label="Label"><Text value={link.label} onChange={(v) => update({ label: v })} /></Field>
                      <Field label="URL" hint="https://… or mailto:you@example.com">
                        <Text value={link.url} onChange={(v) => update({ url: v })} placeholder="https://" />
                      </Field>
                      <Field label="Icon in header" hint="Also always listed in the footer and About page">
                        <Toggle label="Show in header" checked={link.showInHeader} onChange={(v) => update({ showInHeader: v })} />
                      </Field>
                    </ListCard>
                  );
                })}
                <AddButton onClick={() => setLinks([...draft.links, { kind: "website", label: "", url: "", showInHeader: false }])}>
                  Add link
                </AddButton>
              </div>
            )}

            {tab === "site" && (
              <div>
                <Field label="Logo text" hint="Top-left of every page"><Text value={draft.site.logoText} onChange={(v) => setSite({ logoText: v })} /></Field>
                <Field label="Library name" hint="Breadcrumb root and file-explorer footer on posts"><Text value={draft.site.libraryName} onChange={(v) => setSite({ libraryName: v })} /></Field>
                <Field label="Footer tagline"><Text value={draft.site.footerTagline} onChange={(v) => setSite({ footerTagline: v })} /></Field>
                <Field label="GitHub username" hint="Repositories on Home and Projects"><Text value={draft.site.githubUsername} onChange={(v) => setSite({ githubUsername: v })} /></Field>
                <Field label="Projects subtitle"><Text value={draft.site.projectsSubtitle} onChange={(v) => setSite({ projectsSubtitle: v })} /></Field>
                <Field label="Restore defaults" hint="Replace everything with the original built-in content (not saved until you press Save)">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Replace all site content with the built-in defaults?")) setDraft(DEFAULT_SITE_CONFIG);
                    }}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[5px] border border-destructive/40 text-[13px] text-destructive hover:bg-destructive/10"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Restore defaults
                  </button>
                </Field>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Save bar */}
      <div
        className={cn(
          "fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 pl-4 pr-2 h-12 rounded-[10px] border border-border bg-[hsl(0_0%_97%)] shadow-[0_8px_24px_rgba(0,0,0,0.14)] transition-all duration-200",
          dirty ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        )}
        aria-hidden={!dirty}
      >
        <span className="text-[13.5px] text-foreground">Unsaved changes</span>
        <button
          type="button"
          onClick={() => setDraft(saved)}
          className="h-8 px-3 rounded-[6px] text-[13px] text-muted-foreground hover:text-foreground hover:bg-accent/60"
        >
          Discard
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={save.isPending}
          className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-[6px] bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90 disabled:opacity-60"
        >
          {save.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Save <span className="opacity-70 font-normal hidden sm:inline">⌘S</span>
        </button>
      </div>

      {!dirty && (
        <a
          href={`${import.meta.env.BASE_URL}${tab === "about" || tab === "experience" || tab === "education" || tab === "skills" ? "about" : ""}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-1.5 h-9 px-3 rounded-[8px] border border-border bg-[hsl(0_0%_97%)] text-[13px] text-muted-foreground hover:text-foreground shadow-sm"
        >
          View on site <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </Layout>
  );
};

export default AdminSite;
