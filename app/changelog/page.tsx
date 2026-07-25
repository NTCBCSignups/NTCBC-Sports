import Link from "next/link";
import Image from "next/image";
import { CHANGELOG } from "@/config/changelog";
import { ThemeToggle } from "@/components/theme-toggle";

export default function ChangelogPage() {
  return (
    <div className="max-w-2xl mx-auto mb-12 space-y-8 pt-4">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Image src="/favicon.ico" alt="NTCBC" width={18} height={18} className="rounded-sm" />
          NTCBC Signups
        </Link>
        <ThemeToggle />
      </div>

      <div>
        <h1 className="text-3xl font-bold text-foreground">What&apos;s New</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Updates and improvements to NTCBC Signups.
        </p>
      </div>

      <div className="space-y-6">
        {CHANGELOG.map((entry) => (
          <article key={entry.id} className="border-l-2 border-border pl-4">
            <time className="text-xs text-muted-foreground">
              {new Date(entry.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
            <h2 className="text-base font-semibold mt-0.5">{entry.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{entry.description}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
