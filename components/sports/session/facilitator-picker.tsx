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
          <span className="hidden sm:inline truncate max-w-[120px]">
            {selectedUser?.name ?? "Facilitator"}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search users..." />
          <CommandList>
            <CommandEmpty>No users found.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="No facilitator" onSelect={() => handleSelect(null)}>
                <Check className={cn("h-4 w-4 mr-2", !selectedId ? "opacity-100" : "opacity-0")} />
                No facilitator
              </CommandItem>
              {sportUsers.map((user) => (
                <CommandItem
                  key={user.id}
                  value={`${user.name} ${user.id}`}
                  onSelect={() => handleSelect(user.id)}
                >
                  <Check
                    className={cn(
                      "h-4 w-4 mr-2",
                      selectedId === user.id ? "opacity-100" : "opacity-0",
                    )}
                  />
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
