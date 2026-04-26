import Image from "next/image";
import BackButton from "@/components/back-button";
import type { ReactNode } from "react";

interface PageHeaderProps {
    backHref: string;
    backLabel: string;
    actions?: ReactNode;
}

export default function PageHeader({ backHref, backLabel, actions }: PageHeaderProps) {
    return (
        <>
            <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                <Image
                    src="/favicon.ico"
                    alt="NTCBC"
                    width={18}
                    height={18}
                    className="rounded-sm"
                />
                NTCBC Sports
            </div>

            <div className="flex items-center justify-between">
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
