import { Fragment } from "react";

const URL_RE = /https?:\/\/[^\s<>]+/g;

/**
 * Renders text with URLs automatically converted to clickable links.
 * Handles http/https URLs with paths, query params, fragments, and encoded characters.
 */
export function LinkifyText({ children: text }: { children: string }) {
  const parts = text.split(URL_RE);
  const urls = text.match(URL_RE);
  if (!urls) return <>{text}</>;

  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {urls[i] && (
            <a
              href={urls[i]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:text-primary/80 break-all"
            >
              {urls[i]}
            </a>
          )}
        </Fragment>
      ))}
    </>
  );
}

/** Export the regex for testing. */
export { URL_RE };
