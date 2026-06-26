import { Button } from "@/components/ui/button";

interface FormActionsRowProps {
  isDirty: boolean;
  isPending: boolean;
  onReset: () => void;
  onSave: () => void;
  saveLabel?: string;
  pendingLabel?: string;
}

export function FormActionsRow({
  isDirty,
  isPending,
  onReset,
  onSave,
  saveLabel = "Save",
  pendingLabel = "Saving...",
}: FormActionsRowProps) {
  if (!isDirty) return null;

  return (
    <>
      {/* Spacer to prevent content from being hidden behind sticky bar */}
      <div className="h-14" aria-hidden />

      {/* Sticky bottom bar */}
      <div className="sticky bottom-0 z-40 -mx-1 border-t bg-background/95 backdrop-blur-sm p-3 shadow-lg">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={onReset}>
            Reset
          </Button>
          <Button type="button" disabled={isPending} onClick={onSave}>
            {isPending ? pendingLabel : saveLabel}
          </Button>
          <span className="text-xs text-muted-foreground">Unsaved local changes</span>
        </div>
      </div>
    </>
  );
}
