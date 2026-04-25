import DOMPurify from "isomorphic-dompurify";

// Allow the same set of tags/attributes on both client render and server
// write paths so behavior is identical end-to-end.
const ALLOWED_TAGS = [
    "b", "i", "em", "strong", "u", "s", "br", "p", "div", "span",
    "ul", "ol", "li", "a", "font", "h1", "h2", "h3", "h4", "h5", "h6",
    "blockquote", "pre", "code", "hr", "img", "table", "thead", "tbody",
    "tr", "th", "td",
];

const ALLOWED_ATTR = [
    "href", "target", "rel", "style", "color", "size", "class",
    "src", "alt", "width", "height",
];

/**
 * Sanitize HTML to prevent XSS attacks.
 * Allows safe formatting tags (bold, italic, colors, links) but strips scripts/events.
 *
 * Works on both server (Node.js) and client (browser) — backed by
 * `isomorphic-dompurify`. Server-side calls are required so untrusted HTML
 * is never persisted raw, and a future consumer (mobile app, export tool,
 * webhook) can't render the stored content into an XSS sink.
 */
export function sanitizeHtml(dirty: string): string {
    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS,
        ALLOWED_ATTR,
        ALLOW_DATA_ATTR: false,
    });
}

/**
 * Strip all HTML tags — returns plain text only.
 * Safer alternative when rich text rendering is not needed (e.g., previews).
 */
export function stripHtml(dirty: string): string {
    return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
}
