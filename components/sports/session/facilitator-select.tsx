"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Shield, UserRoundPlus } from "lucide-react";
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

export interface FacilitatorSelectProps {
  value: string | null;
  onChange: (userId: string | null) => void;
  users: { id: string; name: string; isTeamMember: boolean }[];
  disabled?: boolean;
  /** Render as full-width trigger (for forms) vs compact button (for inline). */
  fullWidth?: boolean;
}

/** "John Smith" → "John S." */
export function shortenName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name;
  return `${parts[0]} ${parts[parts.length - 1]![0]}.`;
}

/**
 * Shared searchable combobox for selecting a facilitator.
 * Used by both the session-page shortcut button and the session form.
 */
export function FacilitatorSelect({
  value,
  onChange,
  users,
  disabled,
  fullWidth,
}: FacilitatorSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedUser = users.find((u) => u.id === value);

  function handleSelect(userId: string | null) {
    onChange(userId);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("gap-1.5", fullWidth && "justify-between h-9")}
        >
          <UserRoundPlus className="h-4 w-4 shrink-0" />
          {!fullWidth && (
            <span className="sm:hidden truncate max-w-[100px]">
              {selectedUser ? shortenName(selectedUser.name) : "Facilitator"}
            </span>
          )}
          <span
            className={cn("truncate", fullWidth ? "max-w-full" : "hidden sm:inline max-w-[120px]")}
          >
            {selectedUser?.name ?? "No facilitator"}
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
              {value &&
                (() => {
                  const current = users.find((u) => u.id === value);
                  return current ? (
                    <CommandItem
                      key={current.id}
                      value={`${current.name} ${current.id}`}
                      onSelect={() => handleSelect(current.id)}
                    >
                      <Check className="h-4 w-4 mr-2 opacity-100" />
                      <Shield
                        className={cn(
                          "h-3.5 w-3.5 mr-1.5 shrink-0",
                          current.isTeamMember ? "text-muted-foreground" : "invisible",
                        )}
                      />
                      {current.name}
                    </CommandItem>
                  ) : null;
                })()}
              <CommandItem value="No facilitator" onSelect={() => handleSelect(null)}>
                <Check className={cn("h-4 w-4 mr-2", !value ? "opacity-100" : "opacity-0")} />
                No facilitator
              </CommandItem>
              {users
                .filter((u) => u.id !== value)
                .map((user) => (
                  <CommandItem
                    key={user.id}
                    value={`${user.name} ${user.id}`}
                    onSelect={() => handleSelect(user.id)}
                  >
                    <Check className="h-4 w-4 mr-2 opacity-0" />
                    <Shield
                      className={cn(
                        "h-3.5 w-3.5 mr-1.5 shrink-0",
                        user.isTeamMember ? "text-muted-foreground" : "invisible",
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
