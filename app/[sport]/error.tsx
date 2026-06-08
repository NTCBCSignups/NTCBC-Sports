"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function SportError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
            <h2 className="text-xl font-semibold">Something went wrong</h2>
            <p className="text-muted-foreground max-w-md">
                There was a problem loading this sport page. The configuration may not be available.
            </p>
            <div className="flex gap-3">
                <button
                    onClick={reset}
                    className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                    Try again
                </button>
                <Link
                    href="/"
                    className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                    Go home
                </Link>
            </div>
        </div>
    );
}
