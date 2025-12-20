/**
 * Simple toast notification utility
 */
/**
 * Show a toast notification
 */
export function showToast(message, duration = 2000) {
    const container = document.getElementById('toastContainer');
    if (!container)
        return;
    const toast = document.createElement('div');
    toast.className = 'toast toast-success';
    toast.textContent = message;
    container.appendChild(toast);
    // Remove after duration
    setTimeout(() => {
        toast.classList.add('toast-out');
        setTimeout(() => {
            toast.remove();
        }, 200);
    }, duration);
}
//# sourceMappingURL=toast.js.map