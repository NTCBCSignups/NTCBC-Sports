import Image from "next/image";
import Link from "next/link";
import AuthButton from "@/components/sports/auth-button";
import { resolvedSportsConfig } from "@/config/config-resolver";
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
  const config = resolvedSportsConfig[sport];
  if (!config) notFound();

  const user = config.authEnabled ? await getUser() : null;

  return (
    <>
      <div className="max-w-4xl mx-auto flex items-center justify-between min-h-8 mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Image
            src="/favicon.ico"
            alt="NTCBC"
            width={18}
            height={18}
            className="rounded-sm"
          />
          NTCBC Sports
        </Link>
        <div className="flex items-center gap-2">
          {config.authEnabled && <AuthButton user={user} sport={sport} />}
        </div>
      </div>
      {children}
    </>
  );
}
