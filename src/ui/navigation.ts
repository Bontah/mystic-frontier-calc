/**
 * Page navigation
 */

type PageName = 'calculator' | 'roster' | 'info' | 'howtouse';
type HiddenPageName = 'famfinder';
type AllPageName = PageName | HiddenPageName;

const PAGE_INDEX: Record<PageName, number> = {
  calculator: 0,
  roster: 1,
  info: 2,
  howtouse: 3,
};

const HIDDEN_PAGES: HiddenPageName[] = ['famfinder'];

/**
 * Show a specific page
 */
export function showPage(pageName: AllPageName): void {
  // Hide all pages
  document.querySelectorAll('.page').forEach((page) => {
    page.classList.remove('active');
  });

  // Remove active from all nav buttons
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.classList.remove('active');
  });

  // Show selected page
  const page = document.getElementById(`page-${pageName}`);
  if (page) {
    page.classList.add('active');
  }

  // Activate corresponding nav button (only for regular pages)
  if (!HIDDEN_PAGES.includes(pageName as HiddenPageName)) {
    const buttons = document.querySelectorAll('.nav-btn');
    const index = PAGE_INDEX[pageName as PageName];
    if (buttons[index]) {
      buttons[index].classList.add('active');
    }
  }
}

/**
 * Get current active page
 */
export function getCurrentPage(): AllPageName | null {
  const activePage = document.querySelector('.page.active');
  if (!activePage) return null;

  const id = activePage.id;
  if (id.startsWith('page-')) {
    return id.replace('page-', '') as AllPageName;
  }

  return null;
}

/**
 * Check URL for hidden page parameter and navigate if found
 * Returns true if a hidden page was found and navigated to
 */
export function checkUrlForHiddenPage(): boolean {
  const params = new URLSearchParams(window.location.search);
  const pageName = params.get('page');

  if (pageName && HIDDEN_PAGES.includes(pageName as HiddenPageName)) {
    showPage(pageName as HiddenPageName);
    return true;
  }

  return false;
}

/**
 * Setup navigation event listeners
 */
export function setupNavigation(): void {
  document.querySelectorAll('[data-page]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const page = btn.getAttribute('data-page') as PageName;
      if (page) showPage(page);
    });
  });
}
