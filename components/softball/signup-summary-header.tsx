interface SignupSummaryHeaderProps {
    confirmedCount: number;
    waitlistedCount: number;
    playerCap: number | null;
}

export default function SignupSummaryHeader({
    confirmedCount,
    waitlistedCount,
    playerCap,
}: SignupSummaryHeaderProps) {
    return (
        <div className="flex border-b">
            <div className="flex-1 px-4 py-3 border-r">
                <p className="text-xs text-muted-foreground mb-0.5">Confirmed</p>
                <p
                    className={`text-sm font-semibold ${playerCap && confirmedCount > playerCap ? "text-amber-600" : "text-gray-900"}`}
                >
                    {confirmedCount}{playerCap ? ` / ${playerCap}` : ""}
                </p>
            </div>
            <div className="flex-1 px-4 py-3">
                <p className="text-xs text-muted-foreground mb-0.5">Waitlist</p>
                <p className="text-sm font-semibold text-gray-900">
                    {waitlistedCount}
                </p>
            </div>
        </div>
    );
}
