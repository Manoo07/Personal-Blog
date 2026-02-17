export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  tags: string[];
  coverImage: string;
  createdAt: string;
  updatedAt: string;
  status: "draft" | "published";
  readingTime: number;
}

export interface Project {
  title: string;
  description: string;
  tags: string[];
  link?: string;
  github?: string;
}
