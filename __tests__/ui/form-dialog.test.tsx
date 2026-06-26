// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { createElement, useState, type ReactNode, type MouseEvent as ReactMouseEvent } from "react";
import { FormDialog, type FormDialogProps } from "@/components/ui/form-dialog";
import { useConfigurator } from "@/components/ui/configurator";

// ── Mock shadcn/ui Dialog ────────────────────────────────────────
// FormDialog uses Dialog, DialogContent, etc. In happy-dom we mock them
// as simple divs that respect open/onOpenChange.

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    open,
    onOpenChange,
    children,
  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    children: ReactNode;
  }) =>
    open
      ? createElement(
          "div",
          {
            "data-testid": "dialog",
            onClick: (e: ReactMouseEvent) => {
              // Only trigger close when clicking the dialog backdrop itself, not children
              if (e.target === e.currentTarget) onOpenChange(false);
            },
          },
          children,
        )
      : null,
  DialogContent: ({ children, className }: { children: ReactNode; className?: string }) =>
    createElement("div", { "data-testid": "dialog-content", className }, children),
  DialogDescription: ({ children, className }: { children: ReactNode; className?: string }) =>
    createElement("p", { className }, children),
  DialogFooter: ({ children }: { children: ReactNode }) =>
    createElement("div", { "data-testid": "dialog-footer" }, children),
  DialogHeader: ({ children }: { children: ReactNode }) => createElement("div", null, children),
  DialogTitle: ({ children }: { children: ReactNode }) => createElement("h2", null, children),
  DialogTrigger: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    variant,
    className,
    ...rest
  }: {
    children?: ReactNode;
    onClick?: () => void;
    variant?: string;
    className?: string;
    [key: string]: unknown;
  }) => createElement("button", { onClick, "data-variant": variant, className, ...rest }, children),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/lib/styles", () => ({
  statusColors: {
    info: { bg: "bg-info", text: "text-info", border: "border-info" },
    amber: { bg: "bg-amber", text: "text-amber", border: "border-amber" },
  },
}));

// ── Helpers ──────────────────────────────────────────────────────

const DRAFT_PREFIX = "configurator:";

function seedStorage<T>(key: string, draft: T, serverState: T, savedAt = Date.now()) {
  localStorage.setItem(
    DRAFT_PREFIX + key,
    JSON.stringify({ draft, savedAt, serverSnapshot: JSON.stringify(serverState) }),
  );
}

/** Consumer component that renders inside FormDialog. */
function FormContent() {
  const { draft, setDraft, isDirty } = useConfigurator<{ name: string }>();
  return createElement(
    "div",
    null,
    createElement("span", { "data-testid": "draft-value" }, draft.name),
    createElement("span", { "data-testid": "is-dirty" }, String(isDirty)),
    createElement(
      "button",
      {
        "data-testid": "change-btn",
        onClick: () => setDraft({ name: "changed" }),
      },
      "Change",
    ),
  );
}

function TestHarness({
  serverState,
  draftKey = "form-test",
  onSave,
  onDiscard,
  children,
}: {
  serverState: { name: string };
  draftKey?: string;
  onSave?: () => void;
  onDiscard?: () => void;
  children?: FormDialogProps<{ name: string }>["children"];
}) {
  const [open, setOpen] = useState(false);

  const FormDialogTyped = FormDialog as React.ComponentType<FormDialogProps<{ name: string }>>;

  return (
    <div>
      <button data-testid="open-btn" onClick={() => setOpen(true)}>
        Open
      </button>
      <FormDialogTyped
        draftKey={draftKey}
        serverState={serverState}
        open={open}
        onOpenChange={setOpen}
        onSave={onSave}
        onDiscard={onDiscard}
      >
        {children ?? createElement(FormContent)}
      </FormDialogTyped>
    </div>
  );
}

// ── Setup ────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// ── Tests ────────────────────────────────────────────────────────

describe("FormDialog", () => {
  it("renders children inside dialog when open", () => {
    render(createElement(TestHarness, { serverState: { name: "initial" } }));
    // Dialog starts closed
    expect(screen.queryByTestId("draft-value")).toBeNull();
    // Open the dialog
    act(() => screen.getByTestId("open-btn").click());
    expect(screen.getByTestId("draft-value").textContent).toBe("initial");
  });

  it("passes serverState through to Configurator context", () => {
    render(createElement(TestHarness, { serverState: { name: "server" } }));
    act(() => screen.getByTestId("open-btn").click());
    expect(screen.getByTestId("is-dirty").textContent).toBe("false");
  });

  it("shows confirm dialog when closing with dirty state", () => {
    render(createElement(TestHarness, { serverState: { name: "initial" } }));
    act(() => screen.getByTestId("open-btn").click());
    act(() => screen.getByTestId("change-btn").click());

    // Try to close — should show confirm instead
    const dialog = screen.getByTestId("dialog");
    act(() => dialog.click());

    expect(screen.getByText("Unsaved changes")).toBeDefined();
  });

  it("auto-opens when a stored draft is found", async () => {
    seedStorage("form-test", { name: "restored" }, { name: "server" });

    render(createElement(TestHarness, { serverState: { name: "server" } }));

    // The auto-open happens via queueMicrotask, so flush microtasks
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByTestId("draft-value").textContent).toBe("restored");
  });

  it("shows restore banner when draft is restored", async () => {
    seedStorage("form-test", { name: "restored" }, { name: "server" });

    render(createElement(TestHarness, { serverState: { name: "server" } }));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByText(/Restored unsaved changes/)).toBeDefined();
  });

  // ── Confirm dialog: Discard ──────────────────────────────────

  it("discard resets draft to serverState and calls onDiscard", () => {
    const onDiscard = vi.fn();
    render(createElement(TestHarness, { serverState: { name: "initial" }, onDiscard }));
    act(() => screen.getByTestId("open-btn").click());
    act(() => screen.getByTestId("change-btn").click());
    expect(screen.getByTestId("draft-value").textContent).toBe("changed");

    // Close → confirm appears
    const dialog = screen.getByTestId("dialog");
    act(() => dialog.click());
    expect(screen.getByText("Unsaved changes")).toBeDefined();

    // Click Discard
    act(() => screen.getByText("Discard").click());

    // Dialog closed, draft reset, callback fired
    expect(screen.queryByText("Unsaved changes")).toBeNull();
    expect(onDiscard).toHaveBeenCalledOnce();
  });

  // ── Confirm dialog: Save ─────────────────────────────────────

  it("save calls onSave and closes confirm", () => {
    const onSave = vi.fn();
    render(createElement(TestHarness, { serverState: { name: "initial" }, onSave }));
    act(() => screen.getByTestId("open-btn").click());
    act(() => screen.getByTestId("change-btn").click());

    // Close → confirm
    const dialog = screen.getByTestId("dialog");
    act(() => dialog.click());

    // Click Save
    act(() => screen.getByText("Save").click());

    expect(onSave).toHaveBeenCalledOnce();
    expect(screen.queryByText("Unsaved changes")).toBeNull();
    // Main dialog still open
    expect(screen.getByTestId("draft-value")).toBeDefined();
  });

  it("confirm does not reappear after save", () => {
    const onSave = vi.fn();
    render(createElement(TestHarness, { serverState: { name: "initial" }, onSave }));
    act(() => screen.getByTestId("open-btn").click());
    act(() => screen.getByTestId("change-btn").click());

    // Close → confirm → Save
    act(() => screen.getByTestId("dialog").click());
    act(() => screen.getByText("Save").click());

    // Confirm should not be visible
    expect(screen.queryByText("Unsaved changes")).toBeNull();
  });

  // ── onSave optional ──────────────────────────────────────────

  it("shows only Discard (no Save) when onSave not provided", () => {
    render(createElement(TestHarness, { serverState: { name: "initial" } }));
    act(() => screen.getByTestId("open-btn").click());
    act(() => screen.getByTestId("change-btn").click());

    act(() => screen.getByTestId("dialog").click());

    expect(screen.getByText("Discard")).toBeDefined();
    expect(screen.queryByText("Save")).toBeNull();
  });

  it("shows both Discard and Save when onSave provided", () => {
    const onSave = vi.fn();
    render(createElement(TestHarness, { serverState: { name: "initial" }, onSave }));
    act(() => screen.getByTestId("open-btn").click());
    act(() => screen.getByTestId("change-btn").click());

    act(() => screen.getByTestId("dialog").click());

    expect(screen.getByText("Discard")).toBeDefined();
    expect(screen.getByText("Save")).toBeDefined();
  });

  // ── Render prop children ─────────────────────────────────────

  it("supports render prop children with state access", () => {
    render(
      <TestHarness serverState={{ name: "hello" }}>
        {(state: { draft: { name: string }; isDirty: boolean }) =>
          createElement(
            "span",
            { "data-testid": "render-prop" },
            `${state.draft.name}:${state.isDirty}`,
          )
        }
      </TestHarness>,
    );
    act(() => screen.getByTestId("open-btn").click());
    expect(screen.getByTestId("render-prop").textContent).toBe("hello:false");
  });
});
