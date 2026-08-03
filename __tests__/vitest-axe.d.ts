import "vitest";
import type { AxeMatchers } from "vitest-axe/matchers";

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- vitest module augmentation requires empty interface extension
  interface Assertion extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- vitest module augmentation requires empty interface extension
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
