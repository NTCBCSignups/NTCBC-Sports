"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface AuthButtonProps {
  user: User | null;
  sport: string;
}

export default function AuthButton({ user, sport }: AuthButtonProps) {
  const supabase = createClient();

  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${window.location.pathname}`,
      },
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = `/${sport}`;
  };

  if (!user) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleSignIn}
        className="rounded-full"
      >
        <LogIn className="h-4 w-4" />
        Sign in with Google
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {user.user_metadata?.avatar_url && (
          <img
            src={user.user_metadata.avatar_url}
            alt=""
            className="h-7 w-7 rounded-full"
            referrerPolicy="no-referrer"
          />
        )}
        <span className="text-sm text-muted-foreground hidden sm:inline">
          {user.user_metadata?.full_name ?? user.email}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSignOut}
        className="rounded-full"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Sign out</span>
      </Button>
    </div>
  );
}
