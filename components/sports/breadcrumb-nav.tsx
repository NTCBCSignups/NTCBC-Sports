import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Hierarchical breadcrumb navigation.
 *
 * NNGroup "Breadcrumbs: 11 Design Guidelines" (Laubheimer, 2018):
 * - Show the site hierarchy, not session history
 * - Each item is a link except the current page
 * - Current page is the last item, visually differentiated (not clickable)
 * - Use ">" separator (ChevronRight icon)
 * - On mobile: truncate to last 1-2 levels to avoid wrapping
 * - Start with a link to the homepage
 *
 * NNGroup "Breadcrumb Navigation Increasingly Useful" (Nielsen, 2007):
 * - "Breadcrumbs never cause problems in user testing"
 * - "Users who parachute into deep pages via search are rescued"
 * - Cost is minimal (one line), benefit is substantial
 */

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbNavProps {
  /** Ancestor pages (each clickable). Ordered root → parent. */
  items: BreadcrumbItem[];
  /** The current page label (not clickable, visually differentiated). */
  current: string;
  /** Actions shown on the right side (e.g. Admin button). */
  actions?: ReactNode;
}

export default function BreadcrumbNav({ items, current, actions }: BreadcrumbNavProps) {
  return (
    <div className="flex items-center justify-between gap-3 min-h-10">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1 text-sm min-w-0 overflow-hidden"
      >
        <ol className="flex items-center gap-1 min-w-0 flex-wrap">
          {/* On mobile: show only the last ancestor + current (NNGroup guideline #11) */}
          {items.map((item, index) => (
            <li
              key={item.href}
              className={
                index < items.length - 1
                  ? "hidden sm:flex items-center gap-1"
                  : "flex items-center gap-1"
              }
            >
              <Link
                href={item.href}
                className="text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
              >
                {item.label}
              </Link>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
            </li>
          ))}
          {/* Current page — not a link, visually differentiated (NNGroup guideline #5) */}
          <li className="font-medium text-foreground truncate">{current}</li>
        </ol>
      </nav>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
