/**
 * Page navigation
 */
const PAGE_INDEX = {
    calculator: 0,
    roster: 1,
    info: 2,
    howtouse: 3,
};
/**
 * Show a specific page
 */
export function showPage(pageName) {
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
    // Activate corresponding nav button
    const buttons = document.querySelectorAll('.nav-btn');
    const index = PAGE_INDEX[pageName];
    if (buttons[index]) {
        buttons[index].classList.add('active');
    }
}
/**
 * Get current active page
 */
export function getCurrentPage() {
    const activePage = document.querySelector('.page.active');
    if (!activePage)
        return null;
    const id = activePage.id;
    if (id.startsWith('page-')) {
        return id.replace('page-', '');
    }
    return null;
}
/**
 * Setup navigation event listeners
 */
export function setupNavigation() {
    document.querySelectorAll('[data-page]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const page = btn.getAttribute('data-page');
            if (page)
                showPage(page);
        });
    });
}
//# sourceMappingURL=navigation.js.map