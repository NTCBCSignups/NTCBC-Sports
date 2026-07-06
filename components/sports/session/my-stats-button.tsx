import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";

export default function MyStatsButton({ sport }: { sport: string }) {
  return (
    <Button variant="outline" size="sm" asChild>
      <Link href={`/${sport}/stats`}>
        <BarChart3 className="h-4 w-4" />
      </Link>
    </Button>
  );
}
