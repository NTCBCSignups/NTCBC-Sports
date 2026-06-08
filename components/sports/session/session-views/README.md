# How to Implement a New Session View

A session view is a pluggable UI that admins can attach to any session.
Each view type needs exactly **two components**: a Viewer and an Editor.

## 1. Create Your View Files

Create a folder under `components/` (e.g. `components/your-sport/session-views/my-view/`)
with at minimum:

- A **viewer** component (default export) implementing `SessionViewProps`
- An **editor** component (named export) implementing `SessionViewEditorProps`
- An `index.ts` barrel that re-exports both

## 2. Implement the Editor Contract

Your editor **must** expose a `getCurrentData()` method via `useImperativeHandle`:

```tsx
import { useImperativeHandle } from "react";
import type { SessionViewEditorProps } from "@/components/sports/session-views/interfaces";

export function MyEditor({ signups, viewData, ref }: SessionViewEditorProps) {
    const [state, setState] = useState(parseInitialData(viewData));

    // This is how the dialog pulls your data on save — no onChange callback needed.
    useImperativeHandle(ref, () => ({
        getCurrentData: () => state,
    }));

    return <div>...</div>;
}
```

The dialog calls `getCurrentData()` when the admin clicks Save (even from
the "unsaved changes" confirm dialog). You never need to push data up.

## 3. Register Your View

In `components/sports/session-views/registry.ts`, add your view to the registry:

```ts
import MyView, { MyEditor } from "@/components/your-sport/session-views/my-view";

const sessionViewRegistry = {
    ...,
    myView: new SessionView("My View", MyView, MyEditor),
};
```

That's it — admins can now add your view to any session via the Edit Views dialog.

## Key Points

- Editors own their state internally. The dialog never pushes state into them.
- `viewData` is the initial value passed on mount (from the DB). Don't mutate it.
- `getCurrentData()` is called synchronously — return computed data, not a promise.
- If your view has no configuration (like AttendanceView), return `null` from `getCurrentData()`.
- `signups` contains all signups for the session (confirmed, waitlisted, cancelled).
  Filter to what you need (usually confirmed only for editors).
