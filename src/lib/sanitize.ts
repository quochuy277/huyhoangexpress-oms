import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize HTML to prevent XSS attacks.
 * Allows safe formatting tags (bold, italic, colors, links) but strips scripts/events.
 */
export function sanitizeHtml(dirty: string): string {
    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: [
            "b", "i", "em", "strong", "u", "s", "br", "p", "div", "span",
            "ul", "ol", "li", "a", "font", "h1", "h2", "h3", "h4", "h5", "h6",
            "blockquote", "pre", "code", "hr", "img", "table", "thead", "tbody",
            "tr", "th", "td",
        ],
        ALLOWED_ATTR: [
            "href", "target", "rel", "style", "color", "size", "class",
            "src", "alt", "width", "height",
        ],
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
