import { getResolvedSportConfigWithSource } from "@/lib/get-sport-config";

export default async function AdminTabSettings({ sport }: { sport: string }) {
    const sourcedConfig = await getResolvedSportConfigWithSource(sport);

    if (!sourcedConfig) {
        return (
            <section className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">Settings</h2>
                <p className="text-sm text-muted-foreground py-4">Sport config not found.</p>
            </section>
        );
    }

    const { config, source } = sourcedConfig;

    return (
        <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">Settings</h2>
            <div className="rounded-lg border bg-card p-6 space-y-3">
                <p className="text-sm text-muted-foreground">
                    Settings editor wiring is ready. Form-based editing is added in the next implementation slice.
                </p>
                <dl className="text-sm grid gap-2 sm:grid-cols-2">
                    <div>
                        <dt className="font-medium text-foreground">Sport</dt>
                        <dd className="text-muted-foreground">{config.name}</dd>
                    </div>
                    <div>
                        <dt className="font-medium text-foreground">Config source</dt>
                        <dd className="text-muted-foreground capitalize">{source}</dd>
                    </div>
                </dl>
            </div>
        </section>
    );
}
