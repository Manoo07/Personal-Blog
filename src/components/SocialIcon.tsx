import { Github, Linkedin, Twitter, Mail, Globe, Youtube, Link as LinkIcon } from "lucide-react";
import type { SocialKind } from "@/lib/site-config";

const ICONS: Record<SocialKind, React.ComponentType<{ className?: string }>> = {
  github: Github,
  linkedin: Linkedin,
  x: Twitter,
  email: Mail,
  website: Globe,
  youtube: Youtube,
  other: LinkIcon,
};

const SocialIcon = ({ kind, className }: { kind: SocialKind; className?: string }) => {
  const Icon = ICONS[kind] ?? LinkIcon;
  return <Icon className={className} />;
};

export default SocialIcon;
