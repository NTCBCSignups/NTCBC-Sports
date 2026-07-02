import { describe, it, expect } from "vitest";

/**
 * Tests for PostgREST filter sanitization used in searchUsersAction.
 * Verifies that user input containing special characters cannot break
 * the .or() filter parsing or inject additional filter operators.
 */

// Replicated sanitization logic from lib/actions/members.ts
function sanitizeForPostgrest(query: string): string {
  return query.replace(/\\/g, "\\\\").replace(/[%_]/g, "\\$&").replace(/"/g, '""');
}

function buildOrFilter(query: string): string {
  const escaped = sanitizeForPostgrest(query);
  return `full_name.ilike."%${escaped}%",email.ilike."%${escaped}%"`;
}

describe("PostgREST .or() filter sanitization", () => {
  it("normal search term passes through", () => {
    const filter = buildOrFilter("john");
    expect(filter).toBe('full_name.ilike."%john%",email.ilike."%john%"');
  });

  it("escapes SQL LIKE wildcard %", () => {
    const filter = buildOrFilter("100%");
    expect(filter).toBe('full_name.ilike."%100\\%%",email.ilike."%100\\%%"');
  });

  it("escapes SQL LIKE wildcard _", () => {
    const filter = buildOrFilter("a_b");
    expect(filter).toBe('full_name.ilike."%a\\_b%",email.ilike."%a\\_b%"');
  });

  it("escapes backslashes", () => {
    const filter = buildOrFilter("a\\b");
    expect(filter).toBe('full_name.ilike."%a\\\\b%",email.ilike."%a\\\\b%"');
  });

  it("escapes double quotes (PostgREST value quoting)", () => {
    const filter = buildOrFilter('say "hello"');
    expect(filter).toBe('full_name.ilike."%say ""hello""%",email.ilike."%say ""hello""%"');
  });

  it("commas in input are safely contained within quoted value", () => {
    // Without quoting, a comma would split the .or() filter into separate expressions
    const filter = buildOrFilter("test,id.eq.1");
    // The value is double-quoted, so the comma is part of the value, not a filter separator
    expect(filter).toContain('"%test,id.eq.1%"');
    // Both filter parts should start with their column name (proper structure)
    expect(filter).toMatch(/^full_name\.ilike\.".*",email\.ilike\.".*"$/);
  });

  it("dots in input don't break column.operator.value parsing", () => {
    const filter = buildOrFilter("user.name");
    expect(filter).toContain('"%user.name%"');
  });

  it("parentheses in input are contained within quotes", () => {
    const filter = buildOrFilter("test(1)");
    expect(filter).toContain('"%test(1)%"');
  });

  it("empty string after sanitization is safe", () => {
    const filter = buildOrFilter("");
    expect(filter).toBe('full_name.ilike."%%",email.ilike."%%"');
  });
});
