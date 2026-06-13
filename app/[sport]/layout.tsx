import Image from "next/image";
import Link from "next/link";
import AuthButton from "@/components/sports/auth-button";
import { ThemeToggle } from "@/components/theme-toggle";
import LayoutHeader from "@/components/sports/layout-header";
import { getResolvedSportConfig } from "@/lib/get-sport-config";
import { getUser } from "@/lib/supabase/user";
import { notFound } from "next/navigation";

export default async function SportLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ sport: string }>;
}) {
  const { sport } = await params;
  const config = await getResolvedSportConfig(sport);
  if (!config) notFound();

  const user = config.authEnabled ? await getUser() : null;

  return (
    <>
      <LayoutHeader>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Image src="/favicon.ico" alt="NTCBC" width={18} height={18} className="rounded-sm" />
          NTCBC Sports
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {config.authEnabled && <AuthButton user={user} sport={sport} />}
        </div>
      </LayoutHeader>
      {children}
    </>
  );
}
