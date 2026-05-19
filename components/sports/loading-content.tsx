import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

export function LoadingContent() {
    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center gap-3 py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Loading...</span>
            </div>

            <div className="space-y-4">
                <div className="grid gap-6 md:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={i}
                            className="rounded-xl border bg-card p-6 space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-5 w-16 rounded-full" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-48" />
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-4 w-36" />
                            </div>
                            <Skeleton className="h-9 w-full rounded-full" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function LoadingAdminContent() {
    return (
        <div className="flex-1 min-w-0 space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-3 py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Loading...</span>
            </div>

            <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div
                        key={i}
                        className="rounded-lg border bg-card px-4 py-3 space-y-3"
                    >
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <Skeleton className="h-5 w-40" />
                                <Skeleton className="h-3 w-56" />
                            </div>
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-5 w-16 rounded-full" />
                                <Skeleton className="h-5 w-12 rounded-full" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function LoadingSportPage() {
    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center gap-3 py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Loading...</span>
            </div>

            <div className="space-y-6">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-10 w-64" />

                <div className="flex flex-col sm:flex-row sm:gap-12">
                    <div className="space-y-3">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-4 w-36" />
                    </div>
                    <div className="space-y-3 mt-3 sm:mt-0">
                        <Skeleton className="h-4 w-44" />
                        <Skeleton className="h-4 w-52" />
                    </div>
                </div>

                <Skeleton className="h-10 w-full sm:w-64 rounded-full" />
            </div>
        </div>
    );
}
