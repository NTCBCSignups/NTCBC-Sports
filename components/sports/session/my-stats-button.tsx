"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";

interface MyStatsButtonProps {
  sport: string;
}

export default function MyStatsButton({ sport }: MyStatsButtonProps) {
  return (
    <Button variant="outline" size="sm" asChild>
      <Link href={`/${sport}/stats`}>
        <BarChart3 className="h-4 w-4 mr-1.5" />
        My Stats
      </Link>
    </Button>
  );
}
