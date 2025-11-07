import { Building2, User, Home, FileText, Users, Briefcase, MapPin, FolderOpen, LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Building2,
  User,
  Home,
  FileText,
  Users,
  Briefcase,
  MapPin,
  FolderOpen,
};

export const getIconComponent = (iconName: string | null | undefined): LucideIcon => {
  if (!iconName) return FileText;
  return iconMap[iconName] || FileText;
};
