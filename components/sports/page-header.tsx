import Image from "next/image";
import Link from "next/link";
import BackButton from "@/components/sports/back-button";
import type { ReactNode } from "react";

interface PageHeaderProps {
    backHref: string;
    backLabel: string;
    actions?: ReactNode;
}

export default function PageHeader({ backHref, backLabel, actions }: PageHeaderProps) {
    return (
        <>
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
