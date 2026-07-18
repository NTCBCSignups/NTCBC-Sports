import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight, CalendarDays, Clock, Users } from "lucide-react";
import { getResolvedSportsConfigBySport } from "@/lib/get-sport-config";
import { createClient } from "@/lib/supabase/server";
import { checkGlobalAdmin, getUser } from "@/lib/supabase/user";
import CreateSportDialog from "@/components/sports/admin/create-sport-dialog";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import AuthButton from "@/components/sports/auth-button";

export default async function Home() {
  const dbSportsBySlug = await getResolvedSportsConfigBySport();
  const sports = Object.values(dbSportsBySlug);
  const user = await getUser();
  const isAdmin = user ? await checkGlobalAdmin(await createClient(), user.id) : false;

  return (
    <div className="max-w-4xl mx-auto mb-12 space-y-8 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold text-foreground flex items-center gap-3">
          <Image src="/favicon.ico" alt="NTCBC" width={36} height={36} className="rounded-sm" />
          NTCBC Signups
        </h1>
        <div className="flex items-center gap-2">
          {isAdmin && <CreateSportDialog />}
          <ThemeToggle />
          <AuthButton user={user} />
        </div>
      </div>

      <div>
        <p className="text-sm text-muted-foreground">
          Sign up for North Toronto Chinese Baptist Church&apos;s (NTCBC) events! Our ministries and
          activities build community and share the gospel. Everyone is welcome regardless of faith
          background or for sports - skill level. Come join us for great vibes and fellowship!
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 pt-2">
        {sports.map((sport) => (
          <Link key={sport.id} href={`/${sport.id}`} className="block">
            <Card className="flex h-full flex-col overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="text-2xl">
                  {sport.emoji} {sport.name}
                </CardTitle>
                <CardDescription className="text-muted-foreground">{sport.type}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 space-y-4">
                <div className="flex-1 space-y-2 text-sm text-muted-foreground">
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
                    <p className="text-muted-foreground">{sport.description}</p>
                  )}
                </div>
                <span className={cn(buttonVariants(), "w-full rounded-full has-[>svg]:px-8")}>
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
