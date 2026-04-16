import Image from "next/image";
import Link from "next/link";
import AuthButton from "@/components/sports/auth-button";

interface SignInPromptProps {
  sport: string;
}

export default function SignInPrompt({ sport }: SignInPromptProps) {
  return (
    <div className="max-w-4xl mx-auto mb-12 space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
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
        <AuthButton user={null} sport={sport} />
      </div>

      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-gray-900">🥎 Softball</h1>
        <p className="text-sm text-gray-700">
          Join us for scheduled games or drop-in practice sessions. Sign in with
          Google to view and sign up for upcoming sessions.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center space-y-3">
        <p className="text-gray-700 font-medium">
          Sign in to view and sign up for sessions
        </p>
        <p className="text-sm text-gray-500">
          Use your Google account to get started.
        </p>
      </div>
    </div>
  );
}
