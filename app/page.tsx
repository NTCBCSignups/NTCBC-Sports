import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight, CalendarDays, Clock, Users } from "lucide-react";

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto mb-12 space-y-6">
      {/* Header */}
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

      {/* About Section */}
      <div className="space-y-2">
        <h2 className="font-semibold text-gray-900">About Sports Ministry</h2>

        <p className="text-sm text-gray-700">
          Our sports programs are part of North Toronto Chinese Baptist Church's
          (NTCBC) ministry to build community and share the gospel through
          recreation. Everyone is welcome regardless of skill level or faith
          background. Come join us for great games and fellowship!
        </p>
      </div>

      {/* Sports Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Volleyball Card */}
        <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">🏐 Volleyball</CardTitle>
            </div>
            <CardDescription>Drop-in Sessions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                <span>Wednesday nights</span>
              </div>
              <div className="flex justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>6:00 PM - 8:15 PM</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>21 player cap</span>
                </div>
              </div>
              <div className="flex justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>8:15 PM - 10:30 PM</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>18 player cap</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <Button asChild className="w-full rounded-full has-[>svg]:px-8">
                <Link href="/volleyball">
                  View sign-ups <ArrowRight className="w-4 h-4 shrink-0" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Basketball Card */}
        <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-2xl">🏀 Basketball</CardTitle>
            <CardDescription>Drop-in Sessions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                <span>Monday nights</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>7:30 PM - 10:00 PM</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>20 player cap</span>
              </div>
            </div>

            <div className="pt-2">
              <Button asChild className="w-full rounded-full has-[>svg]:px-8">
                <Link href="/basketball">
                  View sign-ups <ArrowRight className="w-4 h-4 shrink-0" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
