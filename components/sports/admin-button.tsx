import Link from "next/link";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminButton({ sport }: { sport: string }) {
  return (
    <Button asChild variant="outline" size="sm">
      <Link href={`/${sport}/admin`}>
        <Settings className="h-4 w-4" />
      </Link>
    </Button>
  );
}
