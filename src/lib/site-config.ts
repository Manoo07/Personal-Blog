/**
 * Site-wide editable content. Stored on the backend as one JSON document
 * (GET /api/site, PUT /api/admin/site) and edited from /manohar/site.
 *
 * DEFAULT_SITE_CONFIG is the content that used to be hard-coded in the pages;
 * it's used until the first save and fills any field missing from the server.
 * Keep the shape in sync with Personal-BlogServices/src/routes/site.ts.
 */

export type SocialKind = "github" | "linkedin" | "x" | "email" | "website" | "youtube" | "other";

export interface SocialLink {
  kind: SocialKind;
  label: string;
  url: string;
  showInHeader: boolean;
}

export interface ExperienceItem {
  role: string;
  company: string;
  period: string;
  type: string;
  description: string;
  skills: string[];
}

export interface EducationItem {
  degree: string;
  field: string;
  school: string;
  period: string;
}

export interface SkillGroup {
  title: string;
  /** Shown in the accent colour (e.g. your primary languages) */
  emphasis: boolean;
  items: string[];
}

export interface SiteConfig {
  version: 1;
  profile: {
    name: string;
    pronouns: string;
    headline: string;
    title: string;
    location: string;
    avatarUrl: string;
  };
  home: {
    greeting: string;
    /** Markdown */
    intro: string;
    primaryCta: string;
    secondaryCta: string;
    recentPostsTitle: string;
    projectsTitle: string;
  };
  about: {
    /** Markdown */
    bio: string;
    experience: ExperienceItem[];
    education: EducationItem[];
    skillGroups: SkillGroup[];
    contactBlurb: string;
  };
  links: SocialLink[];
  site: {
    logoText: string;
    libraryName: string;
    footerTagline: string;
    githubUsername: string;
    projectsSubtitle: string;
  };
}

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  version: 1,
  profile: {
    name: "Manohar Boinapally",
    pronouns: "He/Him",
    headline: "Senior Software Engineer @ SS&C Technologies | Full-Stack Developer | AWS Certified | BE OU'24",
    title: "Senior Software Engineer",
    location: "Hyderabad, Telangana, India",
    avatarUrl: "",
  },
  home: {
    greeting: "Hi, I'm",
    intro:
      "I'm a Senior Software Engineer at **SS&C Technologies** in Hyderabad. Before that I spent two and a half years at OSI Digital, growing from intern to Software Engineer and building full-stack products with Python, Django, React and Docker.\n\nThis blog is where I work through the fundamentals underneath everyday backend work: system design, operating systems, databases and distributed systems. Every series starts from first principles, so you can begin with no background and follow along.",
    primaryCta: "Read the blog",
    secondaryCta: "About me",
    recentPostsTitle: "Recent Writing",
    projectsTitle: "Featured Projects",
  },
  about: {
    bio:
      "I'm a software engineer who builds web applications end to end: the APIs and databases, the React front end, and the containers they ship in. In November 2026 I joined **SS&C Technologies** as a Senior Software Engineer.\n\nBefore that I spent two and a half years at **OSI Digital**, starting as an intern and growing through Project Associate Trainee and Associate Software Engineer to Software Engineer, working mostly with Python, Django, React and Docker. I'm AWS certified.\n\nOutside work I write long-form notes on system design, operating systems, databases and distributed systems. I care about understanding why things work, not just how to use them, and the blog is where those notes live.",
    experience: [
      {
        role: "Senior Software Engineer",
        company: "SS&C Technologies",
        period: "Nov 2026 — Present",
        type: "Full-time · Hybrid · Hyderabad",
        description: "",
        skills: [],
      },
      {
        role: "Software Engineer",
        company: "OSI Digital",
        period: "Apr 2026 — Nov 2026",
        type: "Full-time · 8 mos · Hyderabad",
        description: "",
        skills: ["Python", "Django"],
      },
      {
        role: "Associate Software Engineer",
        company: "OSI Digital",
        period: "Jan 2025 — Mar 2026",
        type: "Full-time · 1 yr 3 mos",
        description:
          "Building production-grade applications and managing deployment infrastructure. Working with React, Docker, and cloud technologies to deliver scalable solutions.",
        skills: ["Docker", "React.js", "TypeScript", "AWS"],
      },
      {
        role: "Project Associate Trainee",
        company: "OSI Digital",
        period: "Jun 2024 — Jan 2025",
        type: "Full-time · 8 mos",
        description:
          "Developed full-stack applications with React and Node.js. Implemented responsive UI designs and optimized backend APIs for performance.",
        skills: ["React.js", "Tailwind CSS", "Node.js", "MongoDB", "TypeScript", "FastAPI"],
      },
      {
        role: "Intern",
        company: "OSI Digital",
        period: "Jan 2024 — Apr 2024",
        type: "Internship · 4 mos · Hyderabad",
        description:
          "Learned core software engineering principles. Built REST APIs with FastAPI, practiced OOP concepts, and worked on algorithmic challenges.",
        skills: ["FastAPI", "Python", "OOP", "SQL", "Git"],
      },
    ],
    education: [
      {
        degree: "Bachelor of Engineering",
        field: "Electronics and Communications Engineering",
        school: "Osmania University, Hyderabad",
        period: "Jul 2020 — Jul 2024",
      },
      {
        degree: "Intermediate (12th)",
        field: "MPC (Mathematics, Physics, Chemistry)",
        school: "Krishnaveni Co-operative Junior College",
        period: "Jun 2018 — Jul 2020",
      },
    ],
    skillGroups: [
      { title: "Languages", emphasis: true, items: ["TypeScript", "JavaScript", "Python", "C++", "C", "SQL"] },
      { title: "Frontend", emphasis: false, items: ["React.js", "Tailwind CSS", "HTML", "CSS", "JavaScript"] },
      { title: "Backend & APIs", emphasis: false, items: ["Django", "Node.js", "FastAPI", "REST APIs", "LangChain"] },
      {
        title: "Databases & Tools",
        emphasis: false,
        items: ["MongoDB", "PostgreSQL", "Redis", "Docker", "Git", "Shell Scripting"],
      },
      { title: "Cloud & DevOps", emphasis: false, items: ["Amazon Web Services (AWS)", "Docker"] },
      {
        title: "Core Concepts",
        emphasis: false,
        items: ["Object-Oriented Programming (OOP)", "Data Structures", "Algorithms"],
      },
    ],
    contactBlurb: "Open to collaborations, project opportunities, or just a friendly chat about tech!",
  },
  links: [
    { kind: "github", label: "GitHub", url: "https://github.com/Manoo07", showInHeader: true },
    {
      kind: "linkedin",
      label: "LinkedIn",
      url: "https://www.linkedin.com/in/manohar-boinapally-81a131205/",
      showInHeader: true,
    },
    { kind: "email", label: "Email", url: "mailto:manohar.boinapally@gmail.com", showInHeader: false },
  ],
  site: {
    logoText: "~/dev",
    libraryName: "Manohar's Library",
    footerTagline: "Built with curiosity, built for a cause.",
    githubUsername: "Manoo07",
    projectsSubtitle: "Recent repositories from my GitHub",
  },
};

type Plain = Record<string, unknown>;
const isPlainObject = (v: unknown): v is Plain => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Overlay a (possibly partial / older) config from the server onto the
 * defaults: objects merge key-by-key, arrays and scalars replace wholesale.
 */
export function mergeWithDefaults(remote: unknown, defaults: SiteConfig = DEFAULT_SITE_CONFIG): SiteConfig {
  const merge = (base: unknown, over: unknown): unknown => {
    if (over === undefined || over === null) return base;
    if (isPlainObject(base) && isPlainObject(over)) {
      const out: Plain = { ...base };
      for (const k of Object.keys(base)) out[k] = merge(base[k], over[k]);
      return out;
    }
    if (Array.isArray(base)) return Array.isArray(over) ? over : base;
    return typeof over === typeof base ? over : base;
  };
  return merge(defaults, remote) as SiteConfig;
}

/** Turn a "mailto:x@y" / "https://…" into a safe href; blank for anything else. */
export function safeHref(url: string): string {
  const u = url.trim();
  return /^(https?:|mailto:)/i.test(u) ? u : "";
}
