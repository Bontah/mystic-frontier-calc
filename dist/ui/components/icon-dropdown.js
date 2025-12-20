/**
 * Custom dropdown component with icon support
 */
/**
 * Element options with icons
 */
export const ELEMENT_OPTIONS = [
    { value: 'None', label: 'None' },
    { value: 'Fire', label: 'Fire', icon: 'element/Fire.png' },
    { value: 'Poison', label: 'Poison', icon: 'element/Poison.png' },
    { value: 'Lightning', label: 'Lightning', icon: 'element/Lightning.png' },
    { value: 'Ice', label: 'Ice', icon: 'element/Ice.png' },
    { value: 'Dark', label: 'Dark', icon: 'element/Dark.png' },
    { value: 'Holy', label: 'Holy', icon: 'element/Holy.png' },
];
/**
 * Type options with icons
 */
export const TYPE_OPTIONS = [
    { value: 'Human', label: 'Human', icon: 'type/Human.png' },
    { value: 'Beast', label: 'Beast', icon: 'type/Beast.png' },
    { value: 'Plant', label: 'Plant', icon: 'type/Plant.png' },
    { value: 'Aquatic', label: 'Aquatic', icon: 'type/Aquatic.png' },
    { value: 'Fairy', label: 'Fairy', icon: 'type/Fairy.png' },
    { value: 'Reptile', label: 'Reptile', icon: 'type/Reptile.png' },
    { value: 'Devil', label: 'Devil', icon: 'type/Devil.png' },
    { value: 'Undead', label: 'Undead', icon: 'type/Undead.png' },
    { value: 'Machine', label: 'Machine', icon: 'type/Machine.png' },
];
/**
 * Create an icon dropdown instance
 */
export function createIconDropdown(config) {
    const container = document.getElementById(config.containerId);
    if (!container) {
        throw new Error(`Container ${config.containerId} not found`);
    }
    let currentValue = config.defaultValue || config.options[0]?.value || '';
    let isOpen = false;
    // Create dropdown structure
    const wrapper = document.createElement('div');
    wrapper.className = 'icon-dropdown';
    const selected = document.createElement('div');
    selected.className = 'icon-dropdown-selected';
    const optionsList = document.createElement('div');
    optionsList.className = 'icon-dropdown-options';
    wrapper.appendChild(selected);
    // Append options to body for proper overflow handling
    document.body.appendChild(optionsList);
    // Render selected option
    function renderSelected() {
        const option = config.options.find(o => o.value === currentValue);
        if (option) {
            selected.innerHTML = `
        ${option.icon ? `<img src="${option.icon}" alt="" class="icon-dropdown-icon">` : ''}
        <span class="icon-dropdown-label">${option.label}</span>
        <span class="icon-dropdown-arrow">▼</span>
      `;
        }
        else {
            selected.innerHTML = `
        <span class="icon-dropdown-label">${config.placeholder || 'Select...'}</span>
        <span class="icon-dropdown-arrow">▼</span>
      `;
        }
    }
    // Render options list
    function renderOptions() {
        optionsList.innerHTML = config.options
            .map(option => `
        <div class="icon-dropdown-option ${option.value === currentValue ? 'selected' : ''}"
             data-value="${option.value}">
          ${option.icon ? `<img src="${option.icon}" alt="" class="icon-dropdown-icon">` : ''}
          <span class="icon-dropdown-label">${option.label}</span>
        </div>
      `)
            .join('');
    }
    // Position the dropdown options relative to the selected element
    function positionOptions() {
        const rect = selected.getBoundingClientRect();
        optionsList.style.position = 'fixed';
        optionsList.style.top = `${rect.bottom}px`;
        optionsList.style.left = `${rect.left}px`;
        optionsList.style.width = `${rect.width}px`;
        optionsList.style.zIndex = '10000';
    }
    // Toggle dropdown
    function toggle() {
        isOpen = !isOpen;
        wrapper.classList.toggle('open', isOpen);
        optionsList.classList.toggle('open', isOpen);
        if (isOpen) {
            positionOptions();
        }
    }
    // Close dropdown
    function close() {
        isOpen = false;
        wrapper.classList.remove('open');
        optionsList.classList.remove('open');
    }
    // Select option
    function selectOption(value) {
        currentValue = value;
        renderSelected();
        renderOptions();
        close();
        config.onChange?.(value);
    }
    // Event handlers
    selected.addEventListener('click', (e) => {
        e.stopPropagation();
        toggle();
    });
    optionsList.addEventListener('click', (e) => {
        const target = e.target;
        const option = target.closest('.icon-dropdown-option');
        if (option) {
            const value = option.getAttribute('data-value');
            if (value) {
                selectOption(value);
            }
        }
    });
    // Close on outside click
    const closeHandler = (e) => {
        if (!wrapper.contains(e.target)) {
            close();
        }
    };
    document.addEventListener('click', closeHandler);
    // Initial render
    renderSelected();
    renderOptions();
    container.appendChild(wrapper);
    return {
        getValue: () => currentValue,
        setValue: (value) => {
            currentValue = value;
            renderSelected();
            renderOptions();
        },
        destroy: () => {
            document.removeEventListener('click', closeHandler);
            wrapper.remove();
            optionsList.remove();
        },
    };
}
//# sourceMappingURL=icon-dropdown.js.map