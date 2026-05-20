import Image from "next/image";
import Link from "next/link";
import BackButton from "@/components/sports/back-button";
import type { ReactNode } from "react";

interface PageHeaderProps {
    backHref: string;
    backLabel: string;
    /** Actions shown next to the back button (e.g. Admin) */
    actions?: ReactNode;
    /** Actions shown on the top row next to NTCBC Sports (e.g. auth) */
    topActions?: ReactNode;
}

export default function PageHeader({ backHref, backLabel, actions, topActions }: PageHeaderProps) {
    return (
        <>
            <div className="flex items-center justify-between min-h-8">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <Image
                        src="/favicon.ico"
                        alt="NTCBC"
                        width={18}
                        height={18}
                        className="rounded-sm"
                    />
                    NTCBC Sports
                </Link>
                {topActions && (
                    <div className="flex items-center gap-2">
                        {topActions}
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between min-h-8">
                <BackButton href={backHref} label={backLabel} />
                {actions && (
                    <div className="flex items-center gap-2">
                        {actions}
                    </div>
                )}
            </div>
        </>
    );
}
