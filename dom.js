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
export const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
export const importClassListBtn = document.getElementById('importClassListBtn');
export const loadLayoutInput = document.getElementById('loadLayoutInput');
export const classCsvInput = document.getElementById('classCsvInput');
export const importStatus = document.getElementById('importStatus');
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


export function openOptimizedLayoutWindow(arrangement, seatCoords, teacherTableCoord, groupsData = []) {
    const popup = window.open('', '_blank', 'width=1100,height=900');
    if (!popup) {
        alert('Popup blocked! Please allow popups for this site.');
        return;
    }

    const doc = popup.document;
    doc.title = 'Optimized Classroom Seating';

    // Add html2canvas script
    const script = doc.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    doc.head.appendChild(script);

    // Add styles
    const style = doc.createElement('style');
    style.textContent = `
        body { 
            font-family: sans-serif; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            padding: 20px; 
            background-color: #f4f4f4; 
        }
        .export-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .grid-container { 
            display: grid; 
            grid-template-columns: repeat(${GRID_WIDTH}, 1fr); 
            width: 960px; 
            height: auto; 
            border: 2px solid #333; 
            background-color: white; 
        }
        .grid-button { 
            width: 100%; 
            height: 64px; /* Square: 960px / 15 cols = 64px */
            border: 1px solid #ccc; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-size: 11px; 
            font-weight: bold; 
            box-sizing: border-box;
            word-break: break-word; /* Wrap long text */
            overflow: hidden;
            min-width: 0; /* Allow shrinking below content size */
            padding: 2px;
            text-align: center;
        }
        .teacher-table { 
            background-color: #dccbf9 !important; 
        }
        .optimised-seat { 
            background-color: #c6eec9 !important; 
        }
        .class-position { 
            margin: 10px 0; 
            font-weight: bold; 
            font-size: 18px; 
        }
        .controls {
            margin-top: 20px;
            display: flex;
            gap: 10px;
            justify-content: center;
        }
        .controls button {
            padding: 8px 16px;
            font-size: 14px;
            border: 1px solid #ccc;
            border-radius: 4px;
            background-color: #f0f0f0;
            cursor: pointer;
        }
        .controls button:hover {
            background-color: #e0e0e0;
        }
        .controls button:disabled {
            cursor: not-allowed;
            opacity: 0.5;
        }
    `;
    doc.head.appendChild(style);

    // Create a container for export (to capture everything including labels)
    const exportContainer = doc.createElement('div');
    exportContainer.className = 'export-container';
    doc.body.appendChild(exportContainer);

    const backText = doc.createElement('div');
    backText.className = 'class-position';
    backText.textContent = 'Back of Class';
    exportContainer.appendChild(backText);

    const container = doc.createElement('div');
    container.className = 'grid-container';
    exportContainer.appendChild(container);

    const frontText = doc.createElement('div');
    frontText.className = 'class-position';
    frontText.textContent = 'Front of Class';
    exportContainer.appendChild(frontText);

    // Render grid
    for (let i = 0; i < GRID_SIZE; i++) {
        const cell = doc.createElement('div');
        cell.className = 'grid-button';

        const row = Math.floor(i / GRID_WIDTH);
        const col = i % GRID_WIDTH;

        if (teacherTableCoord && teacherTableCoord.row === row && teacherTableCoord.col === col) {
            cell.classList.add('teacher-table');
            cell.textContent = 'T';
        }

        const seatIndex = seatCoords.findIndex(coord => coord.row === row && coord.col === col);
        if (seatIndex !== -1) {
            cell.classList.add('optimised-seat');
            cell.textContent = arrangement[seatIndex];
            cell.dataset.studentId = arrangement[seatIndex];

            // Apply group color if student is in a group
            const studentId = parseInt(arrangement[seatIndex], 10);
            if (groupsData && groupsData.length > 0) {
                for (const group of groupsData) {
                    // Check if group.students contains this student ID
                    // group.students is likely array of strings/numbers from input parsing. 
                    // Let's normalize comparison.
                    if (group.students && group.students.some(s => parseInt(s, 10) === studentId)) {
                        cell.style.setProperty('background-color', group.color, 'important');
                        break; // Assume student is in only one group for coloring
                    }
                }
            }
        }

        container.appendChild(cell);
    }

    // Add Save as PNG button
    const controls = doc.createElement('div');
    controls.className = 'controls';

    const displayNamesBtn = doc.createElement('button');
    displayNamesBtn.textContent = 'Display names';
    controls.appendChild(displayNamesBtn);

    const displayIndexBtn = doc.createElement('button');
    displayIndexBtn.textContent = 'Display index no.';
    controls.appendChild(displayIndexBtn);

    // Check for class list
    const storedData = sessionStorage.getItem('classStudentData');
    if (!storedData) {
        displayNamesBtn.disabled = true;
        displayIndexBtn.disabled = true;
    } else {
        const studentData = JSON.parse(storedData);

        displayNamesBtn.onclick = () => {
            const seats = doc.querySelectorAll('.optimised-seat');
            seats.forEach(seat => {
                const id = seat.dataset.studentId;
                if (studentData[id]) {
                    seat.textContent = studentData[id];
                }
            });
        };

        displayIndexBtn.onclick = () => {
            const seats = doc.querySelectorAll('.optimised-seat');
            seats.forEach(seat => {
                seat.textContent = seat.dataset.studentId;
            });
        };
    }

    const saveBtn = doc.createElement('button');
    saveBtn.id = 'savePngBtn';
    saveBtn.textContent = 'Save as PNG';
    controls.appendChild(saveBtn);
    doc.body.appendChild(controls);

    saveBtn.onclick = () => {
        if (!popup.html2canvas) {
            alert('Wait for library to load...');
            return;
        }
        popup.html2canvas(exportContainer).then(canvas => {
            const link = doc.createElement('a');
            link.download = 'classroom-layout.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        });
    };
}

function getColorName(hex) {
    const colorMap = {
        "#FFB7B2": "Red",
        "#B5EAD7": "Green",
        "#BAE1FF": "Blue",
        "#FFFFB5": "Yellow",
        "#A9A9A9": "Gray",
        "#F9F9F9": "White",
        "#E6BE8A": "Brown",
        "#D3D3D3": "Light Gray",
        "#97F2F3": "Cyan",
        "#D7BDE2": "Purple",
    };
    return colorMap[hex] || "";
}
