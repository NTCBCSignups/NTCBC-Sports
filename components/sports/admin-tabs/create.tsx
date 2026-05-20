import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import SessionDialog from "@/components/sports/session-dialog";

export default async function AdminTabCreate({ sport }: { sport: string }) {
    return (
        <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
                Create Session
            </h2>
            <SessionDialog
                sport={sport}
                trigger={
                    <Button className="rounded-full">
                        <Plus className="h-4 w-4 mr-2" />
                        New Session
                    </Button>
                }
            />
        </section>
    );
}
