/**
 * HTML utility functions
 */
/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
/**
 * Create an element from HTML string
 */
export function createElementFromHtml(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild;
}
/**
 * Safely set innerHTML with escaped content
 */
export function setInnerHtml(element, html) {
    element.innerHTML = html;
}
/**
 * Get element by ID with type assertion
 */
export function getElementById(id) {
    return document.getElementById(id);
}
/**
 * Query selector with type assertion
 */
export function querySelector(selector, parent = document) {
    return parent.querySelector(selector);
}
/**
 * Query selector all with type assertion
 */
export function querySelectorAll(selector, parent = document) {
    return parent.querySelectorAll(selector);
}
//# sourceMappingURL=html.js.map