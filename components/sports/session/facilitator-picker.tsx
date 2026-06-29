"use client";

import { useState, useTransition } from "react";
import { Check, ChevronsUpDown, UserRoundPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { toastClasses } from "@/lib/styles";
import { assignFacilitator } from "@/lib/actions/sessions";

/** "John Smith" → "John S." */
function shortenName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name;
  return `${parts[0]} ${parts[parts.length - 1]![0]}.`;
}

interface FacilitatorPickerProps {
  sport: string;
  sessionId: string;
  currentFacilitatorId: string | null;
  sportUsers: { id: string; name: string }[];
}

export default function FacilitatorPicker({
  sport,
  sessionId,
  currentFacilitatorId,
  sportUsers,
}: FacilitatorPickerProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState(currentFacilitatorId);

  const selectedUser = sportUsers.find((u) => u.id === selectedId);

  function handleSelect(userId: string | null) {
    setSelectedId(userId);
    setOpen(false);
    startTransition(async () => {
      const result = await assignFacilitator(sport, sessionId, userId);
      if ("error" in result) {
        setSelectedId(currentFacilitatorId);
        toast.error(result.error, { className: toastClasses.red });
      } else {
        toast.success(userId ? "Facilitator assigned." : "Facilitator removed.", {
          className: toastClasses.green,
        });
      }
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          disabled={pending}
          className="gap-1.5"
        >
          <UserRoundPlus className="h-4 w-4 shrink-0" />
          <span className="sm:hidden truncate max-w-[100px]">
            {selectedUser ? shortenName(selectedUser.name) : "Facilitator"}
          </span>
          <span className="hidden sm:inline truncate max-w-[120px]">
            {selectedUser?.name ?? "Facilitator"}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[220px] p-0"
        align="start"
        side="bottom"
        avoidCollisions={false}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command>
          <CommandInput placeholder="Search users..." />
          <CommandList>
            <CommandEmpty>No users found.</CommandEmpty>
            <CommandGroup>
              {selectedId && (() => {
                const current = sportUsers.find((u) => u.id === selectedId);
                return current ? (
                  <CommandItem
                    key={current.id}
                    value={`${current.name} ${current.id}`}
                    onSelect={() => handleSelect(current.id)}
                  >
                    <Check className="h-4 w-4 mr-2 opacity-100" />
                    {current.name}
                  </CommandItem>
                ) : null;
              })()}
              <CommandItem value="No facilitator" onSelect={() => handleSelect(null)}>
                <Check className={cn("h-4 w-4 mr-2", !selectedId ? "opacity-100" : "opacity-0")} />
                No facilitator
              </CommandItem>
              {sportUsers
                .filter((u) => u.id !== selectedId)
                .map((user) => (
                  <CommandItem
                    key={user.id}
                    value={`${user.name} ${user.id}`}
                    onSelect={() => handleSelect(user.id)}
                  >
                    <Check className="h-4 w-4 mr-2 opacity-0" />
                    {user.name}
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
