"use client";

import { useState, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TeamMemberBadge } from "@/components/sports/badges";
import AdminAccessRequests from "@/components/sports/admin/admin-access-requests";
import { formatDate } from "@/lib/format";
import { colors } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { Search, UserPlus, MoreVertical, ShieldCheck, UserMinus, Crown } from "lucide-react";
import { toast } from "sonner";
import {
  updateMemberRole,
  removeMember,
  bulkUpdateMembers,
  bulkRemoveMembers,
  addMember,
  searchUsersAction,
} from "@/lib/actions/members";
import type {
  SportMember,
  Profile,
  AccessRequestStatus,
  SportRoleType,
} from "@/lib/supabase/types";

// ── Types ────────────────────────────────────────────────────────

interface AccessRequestRow {
  id: string;
  user_id: string;
  status: AccessRequestStatus;
  created_at: string;
  profiles: Profile | null;
}

interface AdminPeopleViewProps {
  sport: string;
  members: SportMember[];
  pendingRequests: AccessRequestRow[];
}

type RoleFilter = "all" | "admin" | "team" | "member";
type SortKey = "name" | "role" | "joined" | "active" | "signups";

// ── Component ────────────────────────────────────────────────────

export default function AdminPeopleView({ sport, members, pendingRequests }: AdminPeopleViewProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);

  // Dialogs
  const [roleDialogUser, setRoleDialogUser] = useState<SportMember | null>(null);
  const [removeDialogUser, setRemoveDialogUser] = useState<SportMember | null>(null);
  const [bulkAction, setBulkAction] = useState<"role" | "team" | "remove" | null>(null);
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  // ── Filtering & Sorting ──────────────────────────────────────

  const filtered = useMemo(() => {
    let result = members;

    // Text search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) => m.fullName?.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
      );
    }

    // Role filter
    if (roleFilter !== "all") {
      result = result.filter((m) => {
        if (roleFilter === "admin") return m.isAdmin;
        if (roleFilter === "team") return m.isTeamMember;
        if (roleFilter === "member") return !m.isAdmin && !m.isTeamMember;
        return true;
      });
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return (a.fullName ?? a.email).localeCompare(b.fullName ?? b.email);
        case "role":
          return (b.sportRole ?? "").localeCompare(a.sportRole ?? "");
        case "joined":
          return (b.joinedAt ?? "").localeCompare(a.joinedAt ?? "");
        case "active":
          return (b.lastActiveDate ?? "").localeCompare(a.lastActiveDate ?? "");
        case "signups":
          return b.totalSignups - a.totalSignups;
        default:
          return 0;
      }
    });

    return result;
  }, [members, search, roleFilter, sortKey]);

  // ── Selection ──────────────────────────────────────────────────

  const allSelected = filtered.length > 0 && filtered.every((m) => selected.has(m.id));

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((m) => m.id)));
    }
  }, [allSelected, filtered]);

  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── Actions ────────────────────────────────────────────────────

  const handleUpdateRole = async (
    userId: string,
    updates: { role?: SportRoleType; isTeamMember?: boolean },
  ) => {
    setPending(true);
    const result = await updateMemberRole(sport, userId, updates);
    if (result.error) toast.error(result.error);
    else toast.success("Role updated");
    setPending(false);
    setRoleDialogUser(null);
  };

  const handleRemove = async (userId: string) => {
    setPending(true);
    const result = await removeMember(sport, userId);
    if (result.error) toast.error(result.error);
    else toast.success("Member removed");
    setPending(false);
    setRemoveDialogUser(null);
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
  };

  const handleBulkRole = async (updates: { role?: SportRoleType; isTeamMember?: boolean }) => {
    setPending(true);
    const result = await bulkUpdateMembers(sport, [...selected], updates);
    if (result.error) toast.error(result.error);
    else toast.success(`Updated ${selected.size} members`);
    setPending(false);
    setBulkAction(null);
    setSelected(new Set());
  };

  const handleBulkRemove = async () => {
    setPending(true);
    const result = await bulkRemoveMembers(sport, [...selected]);
    if (result.error) toast.error(result.error);
    else toast.success(`Removed ${selected.size} members`);
    setPending(false);
    setBulkAction(null);
    setSelected(new Set());
  };

  // ── Render ─────────────────────────────────────────────────────

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">People</h2>
          <Badge variant="secondary">{members.length}</Badge>
        </div>
        <Button size="sm" onClick={() => setAddMemberOpen(true)}>
          <UserPlus className="h-4 w-4 mr-1.5" />
          Add Member
        </Button>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <CollapsibleSection
          title={`Pending Requests`}
          description={`${pendingRequests.length} awaiting review`}
          defaultOpen
        >
          <AdminAccessRequests sport={sport} requests={pendingRequests} />
        </CollapsibleSection>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilter)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
            <SelectItem value="team">Team Members</SelectItem>
            <SelectItem value="member">Regular</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Action Bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 p-2 rounded-lg border bg-muted/50">
          <span className="text-sm font-medium text-muted-foreground">
            {selected.size} selected
          </span>
          <div className="flex gap-1.5 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkAction("role")}
              disabled={pending}
            >
              <Crown className="h-3.5 w-3.5 mr-1" />
              Change Role
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkAction("team")}
              disabled={pending}
            >
              <ShieldCheck className="h-3.5 w-3.5 mr-1" />
              Toggle Team
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkAction("remove")}
              disabled={pending}
              className={colors.destructiveHover}
            >
              <UserMinus className="h-3.5 w-3.5 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      )}

      {/* Members List */}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          {search || roleFilter !== "all" ? "No members match your filters." : "No members yet."}
        </p>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filtered.map((member) => (
              <MobileCard
                key={member.id}
                member={member}
                selected={selected.has(member.id)}
                onToggle={() => toggleOne(member.id)}
                onEditRole={() => setRoleDialogUser(member)}
                onRemove={() => setRemoveDialogUser(member)}
                disabled={pending}
              />
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-hidden rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead>
                    <SortButton current={sortKey} field="name" onSort={setSortKey}>
                      Name
                    </SortButton>
                  </TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>
                    <SortButton current={sortKey} field="role" onSort={setSortKey}>
                      Role
                    </SortButton>
                  </TableHead>
                  <TableHead>
                    <SortButton current={sortKey} field="joined" onSort={setSortKey}>
                      Joined
                    </SortButton>
                  </TableHead>
                  <TableHead>
                    <SortButton current={sortKey} field="active" onSort={setSortKey}>
                      Last Active
                    </SortButton>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton current={sortKey} field="signups" onSort={setSortKey}>
                      Signups
                    </SortButton>
                  </TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((member) => (
                  <TableRow
                    key={member.id}
                    data-state={selected.has(member.id) ? "selected" : undefined}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selected.has(member.id)}
                        onCheckedChange={() => toggleOne(member.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={member.avatarUrl ?? undefined} />
                          <AvatarFallback className="text-xs">
                            {initials(member.fullName ?? member.email)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">
                          {member.fullName ?? member.email.split("@")[0]}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{member.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {member.isAdmin && (
                          <Badge variant="default" className="text-xs">
                            Admin
                          </Badge>
                        )}
                        {member.isTeamMember && <TeamMemberBadge />}
                        {!member.sportRole && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {member.joinedAt ? formatDate(member.joinedAt.split("T")[0]!) : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {member.lastActiveDate
                        ? formatDate(member.lastActiveDate.split("T")[0]!)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {member.totalSignups}
                    </TableCell>
                    <TableCell>
                      <RowActions
                        onEditRole={() => setRoleDialogUser(member)}
                        onRemove={() => setRemoveDialogUser(member)}
                        disabled={pending}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Dialogs */}
      <RoleDialog
        member={roleDialogUser}
        onClose={() => setRoleDialogUser(null)}
        onSave={handleUpdateRole}
        pending={pending}
      />
      <RemoveDialog
        member={removeDialogUser}
        onClose={() => setRemoveDialogUser(null)}
        onConfirm={handleRemove}
        pending={pending}
      />
      <BulkActionDialog
        action={bulkAction}
        count={selected.size}
        onClose={() => setBulkAction(null)}
        onConfirmRole={handleBulkRole}
        onConfirmRemove={handleBulkRemove}
        pending={pending}
      />
      <AddMemberDialog sport={sport} open={addMemberOpen} onClose={() => setAddMemberOpen(false)} />
    </section>
  );
}

// ── Sub-components ───────────────────────────────────────────────

function MobileCard({
  member,
  selected,
  onToggle,
  onEditRole,
  onRemove,
  disabled,
}: {
  member: SportMember;
  selected: boolean;
  onToggle: () => void;
  onEditRole: () => void;
  onRemove: () => void;
  disabled: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-3 flex items-center gap-3">
      <Checkbox checked={selected} onCheckedChange={onToggle} />
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={member.avatarUrl ?? undefined} />
        <AvatarFallback className="text-xs">
          {initials(member.fullName ?? member.email)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-medium text-sm truncate">
            {member.fullName ?? member.email.split("@")[0]}
          </p>
          {member.isTeamMember && <TeamMemberBadge />}
          {member.isAdmin && (
            <Badge variant="default" className="text-xs h-5">
              Admin
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
        {member.totalSignups}
      </div>
      <RowActions onEditRole={onEditRole} onRemove={onRemove} disabled={disabled} />
    </div>
  );
}

function RowActions({
  onEditRole,
  onRemove,
  disabled,
}: {
  onEditRole: () => void;
  onRemove: () => void;
  disabled: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={disabled}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEditRole}>
          <Crown className="h-4 w-4 mr-2" />
          Change Role
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onRemove} variant="destructive">
          <UserMinus className="h-4 w-4 mr-2" />
          Remove
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SortButton({
  children,
  current,
  field,
  onSort,
}: {
  children: React.ReactNode;
  current: SortKey;
  field: SortKey;
  onSort: (key: SortKey) => void;
}) {
  return (
    <button
      onClick={() => onSort(field)}
      className={cn(
        "text-xs font-medium hover:text-foreground transition-colors",
        current === field ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

// ── Dialogs ──────────────────────────────────────────────────────

function RoleDialog({
  member,
  onClose,
  onSave,
  pending,
}: {
  member: SportMember | null;
  onClose: () => void;
  onSave: (userId: string, updates: { role?: SportRoleType; isTeamMember?: boolean }) => void;
  pending: boolean;
}) {
  const [role, setRole] = useState<SportRoleType>("member");
  const [isTeam, setIsTeam] = useState(false);

  // Sync when dialog opens
  const open = !!member;
  if (member && role !== (member.sportRole ?? "member")) {
    setRole(member.sportRole ?? "member");
    setIsTeam(member.isTeamMember);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Role</DialogTitle>
          <DialogDescription>Update role for {member?.fullName ?? member?.email}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <Select value={role} onValueChange={(v) => setRole(v as SportRoleType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="team-member" checked={isTeam} onCheckedChange={(c) => setIsTeam(!!c)} />
            <label htmlFor="team-member" className="text-sm">
              Team member (grants access to restricted sessions)
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => member && onSave(member.id, { role, isTeamMember: isTeam })}
            disabled={pending}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RemoveDialog({
  member,
  onClose,
  onConfirm,
  pending,
}: {
  member: SportMember | null;
  onClose: () => void;
  onConfirm: (userId: string) => void;
  pending: boolean;
}) {
  return (
    <AlertDialog open={!!member} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Member</AlertDialogTitle>
          <AlertDialogDescription>
            Remove <strong>{member?.fullName ?? member?.email}</strong> from this sport? They will
            lose their role and team membership, but their account and signup history remain.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => member && onConfirm(member.id)}
            disabled={pending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function BulkActionDialog({
  action,
  count,
  onClose,
  onConfirmRole,
  onConfirmRemove,
  pending,
}: {
  action: "role" | "team" | "remove" | null;
  count: number;
  onClose: () => void;
  onConfirmRole: (updates: { role?: SportRoleType; isTeamMember?: boolean }) => void;
  onConfirmRemove: () => void;
  pending: boolean;
}) {
  const [bulkRole, setBulkRole] = useState<SportRoleType>("member");

  if (action === "remove") {
    return (
      <AlertDialog open onOpenChange={(o) => !o && onClose()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {count} Members</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {count} members from this sport. Their accounts and signup history
              will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmRemove}
              disabled={pending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove {count} Members
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  if (action === "team") {
    return (
      <AlertDialog open onOpenChange={(o) => !o && onClose()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Toggle Team Membership</AlertDialogTitle>
            <AlertDialogDescription>
              Grant team membership to {count} selected members? This gives access to restricted
              sessions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onConfirmRole({ isTeamMember: true })}
              disabled={pending}
            >
              Grant Team Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  if (action === "role") {
    return (
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role for {count} Members</DialogTitle>
            <DialogDescription>Select the new role for all selected members.</DialogDescription>
          </DialogHeader>
          <Select value={bulkRole} onValueChange={(v) => setBulkRole(v as SportRoleType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => onConfirmRole({ role: bulkRole })} disabled={pending}>
              Apply to {count} Members
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}

function AddMemberDialog({
  sport,
  open,
  onClose,
}: {
  sport: string;
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    { id: string; email: string; fullName: string | null; avatarUrl: string | null }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedRole, setSelectedRole] = useState<SportRoleType>("member");
  const [isTeam, setIsTeam] = useState(false);

  const handleSearch = useCallback(
    async (q: string) => {
      setQuery(q);
      if (q.length < 2) {
        setResults([]);
        return;
      }
      setSearching(true);
      const res = await searchUsersAction(sport, q);
      setResults(res.data ?? []);
      setSearching(false);
    },
    [sport],
  );

  const handleAdd = async (userId: string) => {
    setAdding(true);
    const result = await addMember(sport, userId, { role: selectedRole, isTeamMember: isTeam });
    if (result.error) toast.error(result.error);
    else {
      toast.success("Member added");
      onClose();
      setQuery("");
      setResults([]);
    }
    setAdding(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          setQuery("");
          setResults([]);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Member</DialogTitle>
          <DialogDescription>Search for an existing user to add to this sport.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex gap-3">
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as SportRoleType)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Checkbox id="add-team" checked={isTeam} onCheckedChange={(c) => setIsTeam(!!c)} />
              <label htmlFor="add-team" className="text-sm">
                Team member
              </label>
            </div>
          </div>

          {/* Results */}
          <div className="max-h-48 overflow-y-auto space-y-1">
            {searching && <p className="text-sm text-muted-foreground py-2">Searching...</p>}
            {!searching && query.length >= 2 && results.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">No users found.</p>
            )}
            {results.map((user) => (
              <button
                key={user.id}
                onClick={() => handleAdd(user.id)}
                disabled={adding}
                className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors text-left"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user.avatarUrl ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {initials(user.fullName ?? user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.fullName ?? user.email.split("@")[0]}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Helpers ──────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(/[\s@]+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}
