import AuthButton from "@/components/sports/auth-button";
import PageHeader from "@/components/sports/page-header";
import type { User } from "@supabase/supabase-js";
import type { ReactNode } from "react";
import { sportsConfig } from "@/config/sports-config";

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
    const config = sportsConfig[sport];

    return (
        <div className="max-w-4xl mx-auto mb-12 space-y-6">
            <PageHeader
                backHref="/"
                backLabel="Back to Sports"
                actions={
                    <>
                        {actions}
                        <AuthButton user={user} sport={sport} />
                    </>
                }
            />

            <div className="space-y-2">
                <h1 className="text-4xl font-bold text-gray-900">{config?.emoji} {config?.name ?? sport}</h1>
                {showDescription && config?.description && (
                    <p className="text-sm text-gray-700">
                        {config.description}
                    </p>
                )}
            </div>

            {children}
        </div>
    );
}
