import {
  Calendar,
  ClipboardList,
  History,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Users,
  type LucideIcon,
} from "lucide-react";
import { isAdminTabIconName, type AdminTabIconName } from "@/config/admin-tab-metadata";

export const adminTabIconMap: Record<AdminTabIconName, LucideIcon> = {
  ClipboardList,
  Plus,
  Calendar,
  History,
  RefreshCw,
  SlidersHorizontal,
  Users,
};

export function getAdminTabIcon(iconName: string): LucideIcon {
  return isAdminTabIconName(iconName) ? adminTabIconMap[iconName] : Calendar;
}
