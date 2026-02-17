import { Project } from "@/types/blog";

export const projects: Project[] = [
  {
    title: "Distributed Task Queue",
    description: "A high-performance task queue built with Rust and Redis, supporting delayed jobs, retries, and dead-letter queues. Handles 50K+ jobs/second on a single node.",
    tags: ["Rust", "Redis", "Systems"],
    github: "https://github.com",
  },
  {
    title: "SQL Query Analyzer",
    description: "A web-based tool that visualizes PostgreSQL query execution plans, highlights bottlenecks, and suggests index optimizations automatically.",
    tags: ["TypeScript", "PostgreSQL", "React"],
    link: "https://example.com",
    github: "https://github.com",
  },
  {
    title: "Markdown Note System",
    description: "A local-first, Git-backed note-taking system with bidirectional links, full-text search, and a terminal UI built with Go.",
    tags: ["Go", "CLI", "Productivity"],
    github: "https://github.com",
  },
  {
    title: "Container Orchestrator",
    description: "A minimal container orchestration tool for single-node deployments. Think Docker Compose with built-in health checks and zero-downtime deploys.",
    tags: ["Go", "Docker", "DevOps"],
    github: "https://github.com",
  },
];
