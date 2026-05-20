import type { ReactNode } from "react";
import { statusColors } from "@/lib/styles";

type BannerVariant = "info" | "warning" | "destructive";

interface StatusBannerProps {
  variant: BannerVariant;
  icon: ReactNode;
  title: string;
  message: ReactNode;
  children?: ReactNode;
}

const variantStyles: Record<BannerVariant, { border: string; bg: string; foreground: string; muted: string }> = {
  info: {
    border: "border-status-info-border",
    bg: "bg-status-info",
    foreground: "text-status-info-foreground",
    muted: "text-status-info-foreground/80",
  },
  warning: {
    border: statusColors.amber.border,
    bg: statusColors.amber.bg,
    foreground: statusColors.amber.text,
    muted: "text-status-warning-foreground/80",
  },
  destructive: {
    border: statusColors.red.border,
    bg: statusColors.red.bg,
    foreground: statusColors.red.text,
    muted: "text-status-destructive-foreground/80",
  },
};

export default function StatusBanner({ variant, icon, title, message, children }: StatusBannerProps) {
  const styles = variantStyles[variant];

  return (
    <div className={`rounded-lg border ${styles.border} ${styles.bg} p-4 flex items-start gap-3`}>
      {icon}
      <div className="min-w-0 flex-1">
        <p className={`font-medium ${styles.foreground}`}>{title}</p>
        <p className={`text-sm ${styles.muted}`}>{message}</p>
        {children && <div className="mt-3">{children}</div>}
      </div>
    </div>
  );
}
