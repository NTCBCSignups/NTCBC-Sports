import type { SessionTab } from "./config-interfaces";

export const SESSION_TAB_RULES = {
  valueImmutableAfterCreate: true,
} as const;

export const SESSION_TAB_VALUE_IMMUTABLE_ERROR = "Session tab values are immutable after creation.";

function randomPart(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function createSessionTabId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return `tab-${globalThis.crypto.randomUUID()}`;
  }

  return `tab-${randomPart()}${randomPart()}`;
}

export function normalizeSessionTabValue(value: string): string {
  return value.trim();
}

function buildTabValueByIdMap(tabs: Array<Pick<SessionTab, "id" | "value">>): Map<string, string> {
  const valueById = new Map<string, string>();

  for (const tab of tabs) {
    const id = tab.id?.trim();
    if (!id) {
      continue;
    }

    valueById.set(id, normalizeSessionTabValue(tab.value));
  }

  return valueById;
}

export function validateImmutableSessionTabValues(
  previousTabs: Array<Pick<SessionTab, "id" | "value">>,
  nextTabs: Array<Pick<SessionTab, "id" | "value">>,
): { success: true } | { success: false; error: string } {
  if (!SESSION_TAB_RULES.valueImmutableAfterCreate) {
    return { success: true };
  }

  const previousValueById = buildTabValueByIdMap(previousTabs);

  for (const tab of nextTabs) {
    const id = tab.id?.trim();
    if (!id) {
      continue;
    }

    const previousValue = previousValueById.get(id);
    if (previousValue === undefined) {
      continue;
    }

    if (previousValue !== normalizeSessionTabValue(tab.value)) {
      return {
        success: false,
        error: SESSION_TAB_VALUE_IMMUTABLE_ERROR,
      };
    }
  }

  return { success: true };
}
