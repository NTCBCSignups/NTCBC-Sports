"use client";

import { usePathname } from "next/navigation";
import { LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function SignInToSignupBanner() {
  const pathname = usePathname();

  const handleSignIn = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(pathname)}`,
      },
    });
  };

  return (
    <div className="rounded-lg border border-status-info-border bg-status-info p-4">
      <p className="font-medium text-status-info-foreground">
        Sign in to view and sign up for sessions
      </p>
      <p className="mt-1 text-sm text-status-info-foreground/80">
        Use your Google account to get started.
      </p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mt-3 rounded-full border-status-info-border text-status-info-foreground hover:bg-status-info-border/30"
        onClick={handleSignIn}
      >
        <LogIn className="h-4 w-4" />
        Sign in with Google
      </Button>
    </div>
  );
}
