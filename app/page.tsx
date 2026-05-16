import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight, CalendarDays, Clock, Users } from "lucide-react";
import { resolvedSportsConfig } from "@/config/config-resolver";
import { cn } from "@/lib/utils";

export default function Home() {
  const sports = Object.values(resolvedSportsConfig);

  return (
    <div className="max-w-4xl mx-auto mb-12 space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center gap-3">
          <Image
            src="/favicon.ico"
            alt="NTCBC"
            width={36}
            height={36}
            className="rounded-sm"
          />
          NTCBC Sports
        </h1>
      </div>

      <div className="space-y-2">
        <h2 className="font-semibold text-gray-900">About Sports Ministry</h2>
        <p className="text-sm text-gray-700">
          Our sports programs are part of North Toronto Chinese Baptist
          Church&apos;s (NTCBC) ministry to build community and share the gospel
          through recreation. Everyone is welcome regardless of skill level or
          faith background. Come join us for great games and fellowship!
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {sports.map((sport) => (
          <Link key={sport.id} href={`/${sport.id}`} className="block">
            <Card
              className="flex h-full flex-col overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
            >
              <CardHeader>
                <CardTitle className="text-2xl">
                  {sport.emoji} {sport.name}
                </CardTitle>
                <CardDescription className="text-gray-700">
                  {sport.type}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 space-y-4">
                <div className="flex-1 space-y-2 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    <span>{sport.day}</span>
                  </div>
                  {sport.responseTable?.sessions.map((session) => (
                    <div key={session.time} className="flex justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{session.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{session.playerCap} player cap</span>
                      </div>
                    </div>
                  ))}
                  {sport.description && !sport.responseTable && (
                    <p className="text-gray-500">{sport.description}</p>
                  )}
                </div>
                <span
                  className={cn(
                    buttonVariants(),
                    "w-full rounded-full has-[>svg]:px-8",
                  )}
                >
                  View sign-ups <ArrowRight className="w-4 h-4 shrink-0" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
