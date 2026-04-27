import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
    href: string;
    label: string;
}

export default function BackButton({ href, label }: BackButtonProps) {
    return (
        <Link
            href={href}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
            <ArrowLeft className="h-4 w-4" />
            {label}
        </Link>
    );
}
