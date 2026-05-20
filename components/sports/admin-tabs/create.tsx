import SessionForm from "@/components/sports/session-form";

export default async function AdminTabCreate({ sport }: { sport: string }) {
    return (
        <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
                Create Session
            </h2>
            <div className="rounded-lg border bg-card p-6">
                <SessionForm sport={sport} />
            </div>
        </section>
    );
}
