import { Button } from "@/components/ui/button";
import { StickyActionBar } from "@/components/sports/admin/sticky-action-bar";

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
  return (
    <StickyActionBar visible={isDirty}>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={onReset}>
          Reset
        </Button>
        <Button type="button" disabled={isPending} onClick={onSave}>
          {isPending ? pendingLabel : saveLabel}
        </Button>
        <span className="text-xs text-muted-foreground">Unsaved local changes</span>
      </div>
    </StickyActionBar>
  );
}
