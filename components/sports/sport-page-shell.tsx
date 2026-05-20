import AuthButton from "@/components/sports/auth-button";
import PageHeader from "@/components/sports/page-header";
import type { User } from "@supabase/supabase-js";
import type { ReactNode } from "react";
import { resolvedSportsConfig } from "@/config/config-resolver";

interface SportPageShellProps {
    user: User | null;
    sport: string;
    actions?: ReactNode;
    showDescription?: boolean;
    children: ReactNode;
}

export default function SportPageShell({
    user,
    sport,
    actions,
    showDescription = true,
    children,
}: SportPageShellProps) {
    const config = resolvedSportsConfig[sport];

    return (
        <div className="max-w-4xl mx-auto mb-12 space-y-6">
            <PageHeader
                backHref="/"
                backLabel="Back to Sports"
                topActions={<AuthButton user={user} sport={sport} />}
                actions={actions}
            />

            <div className="space-y-2">
                <h1 className="text-4xl font-bold text-foreground">{config?.emoji} {config?.name ?? sport}</h1>
                {showDescription && config?.description && (
                    <p className="text-sm text-muted-foreground">
                        {config.description}
                    </p>
                )}
            </div>

            {children}
        </div>
    );
}
