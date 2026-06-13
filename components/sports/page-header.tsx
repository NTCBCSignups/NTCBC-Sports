import BackButton from "@/components/sports/back-button";
import type { ReactNode } from "react";

interface PageHeaderProps {
  backHref: string;
  backLabel: string;
  /** Actions shown next to the back button (e.g. Admin) */
  actions?: ReactNode;
}

export default function PageHeader({ backHref, backLabel, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between min-h-8">
      <BackButton href={backHref} label={backLabel} />
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
