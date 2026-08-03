/**
 * Setup file for accessibility tests.
 * Extends Vitest matchers with vitest-axe for a11y assertions.
 *
 * Usage in tests:
 *   const { container } = render(<Component />);
 *   expect(await axe(container)).toHaveNoViolations();
 */
import { expect } from "vitest";
import * as matchers from "vitest-axe/matchers";
import "vitest-axe/extend-expect";

expect.extend(matchers);
