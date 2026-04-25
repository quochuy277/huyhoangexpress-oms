import { describe, expect, it } from "vitest";

import { sanitizeHtml, stripHtml } from "@/lib/sanitize";

describe("sanitizeHtml (server)", () => {
  it("strips <script> tags entirely", () => {
    const dirty = "<p>Hello</p><script>alert(1)</script>";
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain("<p>Hello</p>");
    expect(clean).not.toContain("<script>");
    expect(clean).not.toContain("alert(1)");
  });

  it("strips inline event handlers", () => {
    const dirty = '<a href="https://example.com" onclick="evil()">click</a>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain("onclick");
    expect(clean).not.toContain("evil()");
    expect(clean).toContain("https://example.com");
  });

  it("strips javascript: URLs in href", () => {
    const dirty = '<a href="javascript:alert(1)">x</a>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain("javascript:");
  });

  it("preserves whitelisted formatting tags", () => {
    const dirty = "<b>bold</b> <i>italic</i> <strong>strong</strong>";
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain("<b>bold</b>");
    expect(clean).toContain("<i>italic</i>");
    expect(clean).toContain("<strong>strong</strong>");
  });

  it("preserves anchor tags with safe href", () => {
    const dirty = '<a href="https://example.com" target="_blank" rel="noopener">link</a>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain("https://example.com");
    expect(clean).toContain("link");
  });

  it("strips data attributes", () => {
    const dirty = '<div data-evil="x">hi</div>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain("data-evil");
  });

  it("strips iframes / embed tags", () => {
    const dirty = '<iframe src="https://evil.example.com"></iframe>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toContain("<iframe");
    expect(clean).not.toContain("evil.example.com");
  });

  it("returns empty string when input is empty", () => {
    expect(sanitizeHtml("")).toBe("");
  });
});

describe("stripHtml (server)", () => {
  it("removes all tags", () => {
    expect(stripHtml("<p><b>Hello</b> <i>world</i></p>")).toBe("Hello world");
  });

  it("removes script content too", () => {
    const out = stripHtml("<script>alert(1)</script>safe");
    expect(out).not.toContain("alert(1)");
    expect(out).toContain("safe");
  });
});
