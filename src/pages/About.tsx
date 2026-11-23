import ReactMarkdown from "react-markdown";
import Layout from "@/components/Layout";
import Breadcrumb from "@/components/Breadcrumb";
import SocialIcon from "@/components/SocialIcon";
import { Briefcase, GraduationCap, Wrench, Mail, MapPin } from "lucide-react";
import { useSiteConfig } from "@/hooks/use-site-config";
import { safeHref } from "@/lib/site-config";
import { cn } from "@/lib/utils";

/** Markdown with inline link/bold styling that matches the theme. */
const Md = ({ children, className }: { children: string; className?: string }) => (
  <div className={cn("space-y-3 [&_a]:text-link [&_a]:underline [&_a]:underline-offset-[3px] [&_strong]:font-semibold", className)}>
    <ReactMarkdown>{children}</ReactMarkdown>
  </div>
);

const SectionTitle = ({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) => (
  <h2 className="text-xl sm:text-2xl font-semibold text-heading-2 mb-4 flex items-center gap-2">
    <Icon className="w-5 h-5" />
    {children}
  </h2>
);

const About = () => {
  const { profile, about, links } = useSiteConfig();
  const contactLinks = links.filter((l) => safeHref(l.url));

  return (
    <Layout>
      <section className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 pt-6 pb-12">
        <Breadcrumb items={[{ label: "Home", to: "/" }, { label: "About" }]} />
        <div className="animate-fade-in">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-1.5">{profile.name}</h1>
            {profile.pronouns && <p className="text-sm text-muted-foreground mb-1">{profile.pronouns}</p>}
            {profile.headline && <p className="text-sm sm:text-base text-foreground">{profile.headline}</p>}
            {profile.location && (
              <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {profile.location}
              </p>
            )}
          </div>

          {about.bio && <Md className="text-foreground text-sm sm:text-base leading-relaxed">{about.bio}</Md>}

          {/* Experience */}
          {about.experience.length > 0 && (
            <div className="mt-10">
              <SectionTitle icon={Briefcase}>Experience</SectionTitle>
              <div className="space-y-6">
                {about.experience.map((job, i) => (
                  <div key={i} className="relative pl-5 border-l border-border">
                    <div className="absolute left-[-3px] top-1 w-1.5 h-1.5 rounded-full bg-primary" />
                    {job.period && <p className="text-xs font-mono text-primary mb-1 font-medium">{job.period}</p>}
                    <h3 className="text-sm sm:text-base font-semibold text-foreground mb-0.5">{job.role}</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {job.company && <>@ {job.company}</>}
                      {job.type && <span className="text-xs"> · {job.type}</span>}
                    </p>
                    {job.description && (
                      <Md className="text-xs sm:text-sm text-foreground leading-relaxed mb-2.5">{job.description}</Md>
                    )}
                    {job.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {job.skills.map((skill) => (
                          <span key={skill} className="text-xs px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {about.education.length > 0 && (
            <div className="mt-10">
              <SectionTitle icon={GraduationCap}>Education</SectionTitle>
              <div className="space-y-4">
                {about.education.map((edu, i) => (
                  <div key={i} className="border-l border-border pl-5">
                    <h3 className="text-sm sm:text-base font-semibold text-foreground">{edu.degree}</h3>
                    {edu.field && <p className="text-xs sm:text-sm text-muted-foreground">{edu.field}</p>}
                    {edu.school && <p className="text-xs sm:text-sm text-foreground mt-0.5">{edu.school}</p>}
                    {edu.period && <p className="text-xs text-muted-foreground mt-1">{edu.period}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {about.skillGroups.length > 0 && (
            <div className="mt-10">
              <SectionTitle icon={Wrench}>Skills &amp; Technologies</SectionTitle>
              <div className="space-y-4">
                {about.skillGroups.map((group, i) => (
                  <div key={i}>
                    <h3 className="text-sm font-semibold text-foreground mb-2">{group.title}</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {group.items.map((skill) => (
                        <span
                          key={skill}
                          className={cn(
                            "text-xs px-2.5 py-1 rounded-full",
                            group.emphasis
                              ? "bg-tag text-primary font-medium"
                              : "bg-secondary text-secondary-foreground border border-border"
                          )}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contact */}
          {(about.contactBlurb || contactLinks.length > 0) && (
            <div className="mt-10 p-4 sm:p-5 rounded-lg border border-border bg-secondary/60">
              <h2 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Get in touch
              </h2>
              {about.contactBlurb && <p className="text-muted-foreground text-sm mb-3">{about.contactBlurb}</p>}
              <div className="flex flex-wrap gap-4">
                {contactLinks.map((l) => (
                  <a
                    key={l.url}
                    href={safeHref(l.url)}
                    {...(l.url.startsWith("mailto:") ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-link hover:underline underline-offset-4"
                  >
                    <SocialIcon kind={l.kind} className="w-4 h-4" />
                    {l.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default About;
