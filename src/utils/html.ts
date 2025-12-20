/**
 * HTML utility functions
 */

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Create an element from HTML string
 */
export function createElementFromHtml(html: string): HTMLElement {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstChild as HTMLElement;
}

/**
 * Safely set innerHTML with escaped content
 */
export function setInnerHtml(element: HTMLElement, html: string): void {
  element.innerHTML = html;
}

/**
 * Get element by ID with type assertion
 */
export function getElementById<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

/**
 * Query selector with type assertion
 */
export function querySelector<T extends HTMLElement>(
  selector: string,
  parent: ParentNode = document
): T | null {
  return parent.querySelector(selector) as T | null;
}

/**
 * Query selector all with type assertion
 */
export function querySelectorAll<T extends HTMLElement>(
  selector: string,
  parent: ParentNode = document
): NodeListOf<T> {
  return parent.querySelectorAll(selector) as NodeListOf<T>;
}
