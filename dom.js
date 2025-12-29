import { GRID_SIZE, COLORS, GRID_WIDTH } from './constants.js';

// --- DOM Element Declarations ---
export const gridContainer = document.getElementById('myGrid');
export const confirmTeacherBtn = document.getElementById('confirmTeacherBtn');
export const reselectTeacherBtn = document.getElementById('reselectTeacherBtn');
export const reselectSeatsBtn = document.getElementById('reselectSeatsBtn');
export const confirmBtn = document.getElementById('confirmBtn');
export const resetBtn = document.getElementById('resetBtn');
export const addConditionBtn = document.getElementById('addConditionBtn');
export const optimiseBtn = document.getElementById('optimiseBtn');
export const saveLayoutBtn = document.getElementById('saveLayoutBtn');
export const loadLayoutBtn = document.getElementById('loadLayoutBtn');
export const loadLayoutInput = document.getElementById('loadLayoutInput');
export const considerationsContainer = document.querySelector('.considerations-container');
export const easterEgg = document.getElementById('easterEgg');
export const addGroupBtn = document.getElementById('addGroupBtn');
export const groupList = document.getElementById('group-list');

export function initialiseDOM(toggleSeat) {
    gridContainer.innerHTML = '';
    for (let i = 0; i < GRID_SIZE; i++) {
        const button = document.createElement('div');
        button.classList.add('grid-button');
        button.dataset.index = i;
        button.addEventListener('click', () => toggleSeat(button));
        gridContainer.appendChild(button);
    }

    const allRows = document.querySelectorAll('.considerations-row');
    allRows.forEach((row, index) => {
        if (index > 0) {
            row.remove();
        } else {
            const inputs = row.querySelectorAll('input, select');
            inputs.forEach(input => {
                input.disabled = true;
                input.value = '';
            });
            row.querySelector('select[name="condition"]').value = 'Far';
            row.querySelector('select[name="importance"]').value = 'high';
            const deleteBtn = row.querySelector('.delete-row-btn');
            if (deleteBtn) {
                deleteBtn.disabled = true;
                deleteBtn.style.visibility = 'hidden';
            }
        }
    });

    const allGroupRows = document.querySelectorAll('.group-row');
    allGroupRows.forEach((row, index) => {
        if (index > 0) {
            row.remove();
        } else {
            const input = row.querySelector('input');
            input.value = '';
            input.disabled = true;
            const deleteBtn = row.querySelector('.delete-group-btn');
            deleteBtn.style.visibility = 'hidden';
            const colorDropdown = row.querySelector('.color-dropdown');
            const selectedColor = row.querySelector('.selected-color');
            const initialColor = COLORS[0];
            selectedColor.style.backgroundColor = initialColor;
            selectedColor.dataset.hex = initialColor;
            populateColorDropdown(colorDropdown, initialColor);
        }
    });
    updateGroupLabels();
    updateAddGroupButtonState();

    confirmTeacherBtn.disabled = false;
    reselectTeacherBtn.disabled = true;
    reselectSeatsBtn.disabled = true;
    confirmBtn.disabled = true;
    addConditionBtn.disabled = true;
    optimiseBtn.disabled = true;
    saveLayoutBtn.disabled = true;

    document.querySelectorAll('.teacher-option').forEach(option => {
        option.style.display = 'none';
    });

    if (easterEgg) {
        easterEgg.style.color = 'transparent';
        easterEgg.style.userSelect = 'none';
    }
}

export function addConditionRow(condition = null, studentCount) {
    const templateRow = document.querySelector('.considerations-row');
    if (!templateRow) return;

    const newRow = templateRow.cloneNode(true);
    const inputs = newRow.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.disabled = false;
        input.value = '';
        if (input.type === 'number') {
            input.max = studentCount;
        }
    });
    newRow.querySelector('select[name="condition"]').value = 'Far';
    newRow.querySelector('select[name="importance"]').value = 'high';

    if (condition) {
        newRow.querySelector('[name="integer1"]').value = condition.student1 || '';
        newRow.querySelector('[name="condition"]').value = condition.condition || 'Far';
        newRow.querySelector('[name="integer2"]').value = condition.student2 || '';
        newRow.querySelector('[name="importance"]').value = condition.importance || 'high';
    }

    const conditionSelect = newRow.querySelector('select[name="condition"]');
    const secondIntegerInput = newRow.querySelector('[name="integer2"]');
    const selectedValue = conditionSelect.value;

    if (selectedValue === 'Front' || selectedValue === 'Back' || selectedValue === 'NearTeacher') {
        secondIntegerInput.disabled = true;
        secondIntegerInput.value = '';
    } else {
        secondIntegerInput.disabled = false;
    }

    const deleteBtn = newRow.querySelector('.delete-row-btn');
    deleteBtn.disabled = false;
    deleteBtn.style.visibility = 'visible';
    deleteBtn.addEventListener('click', () => newRow.remove());

    considerationsContainer.appendChild(newRow);
}

export function addGroupRow() {
    const templateRow = document.querySelector('.group-row');
    if (!templateRow) return;

    const newRow = templateRow.cloneNode(true);
    const input = newRow.querySelector('input');
    input.value = '';

    // If layout is confirmed, enable the input. Otherwise, it should stay disabled.
    // Layout is confirmed if confirmBtn is disabled and reselectSeatsBtn is enabled.
    const isLayoutConfirmed = confirmBtn.disabled && !reselectSeatsBtn.disabled;
    input.disabled = !isLayoutConfirmed;

    const deleteBtn = newRow.querySelector('.delete-group-btn');
    deleteBtn.disabled = false;
    deleteBtn.style.visibility = 'visible';

    const colorDropdown = newRow.querySelector(".color-dropdown");
    const selectedColor = newRow.querySelector(".selected-color");
    // Find first unused color
    const usedColors = new Set(
        Array.from(document.querySelectorAll('.selected-color'))
            .map(el => el.dataset.hex)
    );

    let nextColor = COLORS[0];
    for (const color of COLORS) {
        if (!usedColors.has(color)) {
            nextColor = color;
            break;
        }
    }

    selectedColor.style.backgroundColor = nextColor;
    selectedColor.dataset.hex = nextColor;
    populateColorDropdown(colorDropdown, nextColor);

    groupList.appendChild(newRow);
    updateGroupLabels();
    updateAddGroupButtonState();
}

export function updateGroupLabels() {
    const groupRows = groupList.querySelectorAll('.group-row');
    groupRows.forEach((row, index) => {
        const groupNumber = index + 1;
        const label = row.querySelector('label');
        const input = row.querySelector('input');
        const selectedColorHex = row.querySelector('.selected-color').dataset.hex;

        label.textContent = `${getColorName(selectedColorHex)} Group Students:`;
        label.setAttribute('for', `group-students-${groupNumber}`);
        input.id = `group-students-${groupNumber}`;
    });
}

export function updateAddGroupButtonState() {
    const currentGroups = document.querySelectorAll('.group-row').length;
    const isLayoutConfirmed = confirmBtn.disabled && !reselectSeatsBtn.disabled;
    // Disable if current groups >= total available colors OR if layout is not confirmed
    addGroupBtn.disabled = (currentGroups >= COLORS.length) || !isLayoutConfirmed;
}

export function populateColorDropdown(colorDropdown, currentGroupColor) {
    colorDropdown.innerHTML = '';

    const usedColors = new Set(
        Array.from(document.querySelectorAll('.selected-color'))
            .map(el => el.dataset.hex)
    );

    COLORS.forEach(color => {
        if (!usedColors.has(color) || color === currentGroupColor) {
            const colorOption = document.createElement('div');
            colorOption.classList.add('color-option');
            colorOption.style.backgroundColor = color;
            colorOption.dataset.hex = color;
            colorDropdown.appendChild(colorOption);
        }
    });
}


export function displayArrangement(arrangement, seatCoords) {
    document.querySelectorAll('.grid-button').forEach(btn => {
        btn.textContent = '';
        btn.classList.remove('optimised-seat');
    });

    arrangement.forEach((student, i) => {
        const coord = seatCoords[i];
        const index = coord.row * GRID_WIDTH + coord.col;
        const button = document.querySelector(`.grid-button[data-index='${index}']`);
        if (button) {
            button.textContent = student;
            button.classList.add('optimised-seat');
        }
    });
}

function getColorName(hex) {
    const colorMap = {
        "#FF0000": "Red",
        "#00FF00": "Green",
        "#00BFFF": "Blue",
        "#FFFF00": "Yellow",
        "#800080": "Purple",
        "#00FFFF": "Cyan",
        "#8B4513": "Brown",
        "#666666ff": "Gray",
        "#000000ff": "Black",
        "#ffffffff": "White",
    };
    return colorMap[hex] || "";
}
