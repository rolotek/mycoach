import type { LucideIcon } from "lucide-react";
import {
  FileSpreadsheet,
  FileText,
  BookOpen,
  Github,
  GitBranch,
  Figma,
  Cloud,
  ExternalLink,
} from "lucide-react";

const LINK_ICON_MAP: Record<string, LucideIcon> = {
  sharepoint: FileSpreadsheet,
  "google-docs": FileText,
  notion: BookOpen,
  github: Github,
  gitlab: GitBranch,
  figma: Figma,
  confluence: BookOpen,
  dropbox: Cloud,
  generic: ExternalLink,
};

export function getLinkIcon(linkType: string): LucideIcon {
  return LINK_ICON_MAP[linkType] ?? ExternalLink;
}
