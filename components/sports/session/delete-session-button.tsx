"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Trash2 } from "lucide-react";
import { deleteSession } from "@/lib/actions/sessions";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { colors, toastClasses } from "@/lib/styles";

interface DeleteSessionButtonProps {
  sport: string;
  sessionId: string;
  /** Render as a dropdown menu item instead of an icon button. */
  asMenuItem?: boolean;
}

export default function DeleteSessionButton({
  sport,
  sessionId,
  asMenuItem,
}: DeleteSessionButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const handleDelete = async () => {
    setPending(true);
    const result = await deleteSession(sport, sessionId);
    setPending(false);

    if ("error" in result) {
      toast.error(result.error, { className: toastClasses.red });
      return;
    }

    setOpen(false);
    toast("Session deleted.");
    router.refresh();
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {asMenuItem ? (
          <DropdownMenuItem
            onSelect={(e) => e.preventDefault()}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className={colors.destructiveHover}
            title="Delete session"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this session?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the session and its sign-ups.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={handleDelete} disabled={pending}>
            {pending ? "Deleting..." : "Delete Session"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
