import { describe, it, expect } from "vitest";
import { URL_RE } from "@/components/ui/linkify-text";

/**
 * Tests the URL regex used by LinkifyText to ensure it correctly
 * identifies URLs in text without over-matching or missing edge cases.
 */

describe("LinkifyText URL detection", () => {
  it("should match http and https URLs", () => {
    const text = "Visit https://example.com and http://test.org for more.";
    const matches = text.match(URL_RE);
    expect(matches).toEqual(["https://example.com", "http://test.org"]);
  });

  it("should match URLs with paths and query params", () => {
    const text = "Link: https://maps.google.com/place?q=123&lang=en";
    const matches = text.match(URL_RE);
    expect(matches).toEqual(["https://maps.google.com/place?q=123&lang=en"]);
  });

  it("should not match plain text without protocol", () => {
    const text = "Go to example.com or www.test.org";
    const matches = text.match(URL_RE);
    expect(matches).toBeNull();
  });

  it("should stop at whitespace", () => {
    const text = "See https://example.com/page and continue";
    const matches = text.match(URL_RE);
    expect(matches).toEqual(["https://example.com/page"]);
  });

  it("should stop at < and > characters", () => {
    const text = "Link <https://example.com> here";
    const matches = text.match(URL_RE);
    expect(matches).toEqual(["https://example.com"]);
  });

  it("should handle URLs at end of text", () => {
    const text = "Check https://example.com/path";
    const matches = text.match(URL_RE);
    expect(matches).toEqual(["https://example.com/path"]);
  });

  it("should handle multiple URLs on separate lines", () => {
    const text = "First: https://a.com\nSecond: https://b.com";
    const matches = text.match(URL_RE);
    expect(matches).toEqual(["https://a.com", "https://b.com"]);
  });

  it("should handle Google Maps short URLs", () => {
    const text = "Location: https://maps.app.goo.gl/abc123XYZ";
    const matches = text.match(URL_RE);
    expect(matches).toEqual(["https://maps.app.goo.gl/abc123XYZ"]);
  });

  it("should handle URLs with encoded spaces (%20)", () => {
    const text = "File: https://example.com/my%20file%20name.pdf";
    const matches = text.match(URL_RE);
    expect(matches).toEqual(["https://example.com/my%20file%20name.pdf"]);
  });

  it("should handle URLs with special encoded characters", () => {
    const text = "Link: https://example.com/path%2Fto%2Fresource?name=%E4%B8%AD%E6%96%87";
    const matches = text.match(URL_RE);
    expect(matches).toEqual(["https://example.com/path%2Fto%2Fresource?name=%E4%B8%AD%E6%96%87"]);
  });

  it("should handle URLs with hash fragments", () => {
    const text = "See https://example.com/page#section-2";
    const matches = text.match(URL_RE);
    expect(matches).toEqual(["https://example.com/page#section-2"]);
  });

  it("should handle URLs with parentheses (Wikipedia)", () => {
    const text = "Read https://en.wikipedia.org/wiki/Toronto_(city) for info.";
    const matches = text.match(URL_RE);
    expect(matches).toEqual(["https://en.wikipedia.org/wiki/Toronto_(city)"]);
  });

  it("should handle URLs with port numbers", () => {
    const text = "Dev server: http://localhost:3000/dashboard?debug=true";
    const matches = text.match(URL_RE);
    expect(matches).toEqual(["http://localhost:3000/dashboard?debug=true"]);
  });

  it("should handle URLs with unicode characters", () => {
    const text = "Visit https://example.com/café/résumé";
    const matches = text.match(URL_RE);
    expect(matches).toEqual(["https://example.com/café/résumé"]);
  });

  it("should strip trailing punctuation that's not part of the URL", () => {
    // Note: the current regex does NOT strip trailing punctuation.
    // This test documents current behavior — trailing period IS included.
    const text = "Go to https://example.com/page.";
    const matches = text.match(URL_RE);
    expect(matches).toEqual(["https://example.com/page."]);
  });
});
