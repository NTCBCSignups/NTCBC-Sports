import PageHeader from "@/components/sports/page-header";
import type { User } from "@supabase/supabase-js";
import type { ReactNode } from "react";
import type { ResolvedSportConfig } from "@/config/config-resolver";

interface SportPageShellProps {
    user: User | null;
    sport: string;
    config: ResolvedSportConfig;
    actions?: ReactNode;
    showDescription?: boolean;
    children: ReactNode;
}

export default function SportPageShell({
    user,
    sport,
    config,
    actions,
    showDescription = true,
    children,
}: SportPageShellProps) {
    return (
        <div className="max-w-4xl mx-auto mb-12 space-y-6">
            <PageHeader
                backHref="/"
                backLabel="Back to Sports"
                actions={actions}
            />

            <div className="space-y-2">
                <h1 className="text-4xl font-bold text-foreground">{config.emoji} {config.name}</h1>
                {showDescription && config.description && (
                    <p className="text-sm text-muted-foreground">
                        {config.description}
                    </p>
                )}
            </div>

            {children}
        </div>
    );
}
