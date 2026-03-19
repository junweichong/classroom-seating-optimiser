import { GRID_WIDTH } from './constants.js';
import {
    initialiseDOM,
    addConditionRow,
    addGroupRow,
    updateGroupLabels,
    gridContainer,
    confirmTeacherBtn,
    reselectTeacherBtn,
    reselectSeatsBtn,
    confirmBtn,
    resetBtn,
    addConditionBtn,
    optimiseBtn,
    saveLayoutBtn,
    loadLayoutBtn,
    loadLayoutInput,
    downloadTemplateBtn,
    importClassListBtn,
    classCsvInput,
    importStatus,
    groupList,
    considerationsContainer,
    populateColorDropdown,
    updateAddGroupButtonState,
    openOptimizedLayoutWindow
} from './dom.js';
import { runOptimisation } from './genetic-algorithm.js';
import { saveLayout, loadLayout, applyLayout } from './layout.js';

document.addEventListener('DOMContentLoaded', () => {
    let selectedSeatsCoords = [];
    let studentCount = 0;
    let teacherTableCoords = [];
    let teacherTableConfirmed = false;
    let keySequence = '';
    let groupSelectionMode = false;
    let currentGroupColor = null;
    let expectedGroupSize = 0;
    let currentGroupSelectedCount = 0;
    let currentGroupRow = null;

    const initialise = () => {
        initialiseDOM(toggleSeat);
        selectedSeatsCoords = [];
        studentCount = 0;
        teacherTableCoords = [];
        teacherTableConfirmed = false;
        keySequence = '';
        groupSelectionMode = false;
        currentGroupColor = null;
        expectedGroupSize = 0;
        currentGroupSelectedCount = 0;
        currentGroupRow = null;
    };

    // --- Event Listeners ---
    confirmTeacherBtn.addEventListener('click', confirmTeacherSelection);
    reselectTeacherBtn.addEventListener('click', reselectTeacher);
    reselectSeatsBtn.addEventListener('click', reselectSeats);
    confirmBtn.addEventListener('click', confirmSelection);
    resetBtn.addEventListener('click', initialise);
    addConditionBtn.addEventListener('click', () => addConditionRow(null, studentCount));
    optimiseBtn.addEventListener('click', () => {
        const considerations = getConsiderations();
        const groupConstraints = getGroupConstraints();

        // Disable group inputs
        document.querySelectorAll('.groups-container input, .groups-container button').forEach(el => el.disabled = true);

        const storedData = sessionStorage.getItem('classStudentData');
        const studentMetadata = storedData ? JSON.parse(storedData) : null;

        const bestArrangement = runOptimisation(considerations, studentCount, selectedSeatsCoords, teacherTableCoords, groupConstraints, studentMetadata);
        if (bestArrangement) {
            openOptimizedLayoutWindow(bestArrangement, selectedSeatsCoords, teacherTableCoords, groupConstraints);
        }

        // Based on existing patterns, we might want to keep them disabled until 'Reselect Seats' is clicked)
    });
    saveLayoutBtn.addEventListener('click', () => saveLayout(teacherTableCoords, selectedSeatsCoords, getRawConsiderations, getGroupsData));
    loadLayoutBtn.addEventListener('click', () => loadLayoutInput.click());
    loadLayoutInput.addEventListener('change', (event) => loadLayout(event, (layout) => applyLayout(layout, initialise, confirmTeacherSelection, confirmSelection, addConditionRow, addGroupRow)));

    downloadTemplateBtn.addEventListener('click', () => {
        const csvContent = "Index No,Name,Handed";
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'class list template.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    });

    importClassListBtn.addEventListener('click', () => classCsvInput.click());
    classCsvInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const rows = text.split('\n');
            const studentData = {};
            let count = 0;

            // Simple parsing: assume header exists
            // Try to find indices for 'index'/'id' and 'name'
            let idIndex = 0;
            let nameIndex = 1;
            let handedIndex = -1;

            if (rows.length > 0) {
                const header = rows[0].toLowerCase().split(',');
                const foundId = header.findIndex(h => h.includes('index') || h.includes('id') || h.includes('no'));
                const foundName = header.findIndex(h => h.includes('name') || h.includes('student'));
                const foundHanded = header.findIndex(h => h.includes('handed') || h.includes('hand'));

                if (foundId !== -1) idIndex = foundId;
                if (foundName !== -1) nameIndex = foundName;
                if (foundHanded !== -1) handedIndex = foundHanded;
            }

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i].trim();
                if (!row) continue;

                const cols = row.split(',');
                if (cols.length < 2 && idIndex === 0 && nameIndex === 1) continue; // Skip malformed rows if extracting default

                const id = parseInt(cols[idIndex].trim(), 10);
                const name = cols[nameIndex] ? cols[nameIndex].trim() : '';
                const handed = (handedIndex !== -1 && cols[handedIndex]) ? cols[handedIndex].trim().toUpperCase() : '';

                if (!isNaN(id) && name) {
                    studentData[id] = { name, handed };
                    count++;
                }
            }

            if (count > 0) {
                sessionStorage.setItem('classStudentData', JSON.stringify(studentData));
                importStatus.textContent = `Successfully imported: ${file.name}`;
                importStatus.style.color = 'green';
                // alert(`Class list imported successfully! Loaded ${count} students.`);
                setTimeout(() => {
                    importStatus.textContent = '';
                }, 5000);
            } else {
                alert('No valid student data found in CSV. Please ensure columns for "Index No" and "Name" exist.');
            }
            // Reset input so same file can be selected again
            classCsvInput.value = '';
        };
        reader.readAsText(file);
    });

    addGroupBtn.addEventListener('click', addGroupRow);

    groupList.addEventListener('click', (event) => {
        if (event.target.classList.contains('delete-group-btn') && !event.target.disabled) {
            const row = event.target.closest('.group-row');
            const groupColor = row.querySelector('.selected-color').dataset.hex;

            // Clear any grid seats that belong to this group
            document.querySelectorAll(`.grid-button[data-group-color="${groupColor}"]`).forEach(btn => {
                btn.style.removeProperty('background-color');
                delete btn.dataset.groupColor;
            });

            row.remove();
            updateGroupLabels();
            updateAddGroupButtonState();
        } else if (event.target.classList.contains('selected-color')) {
            // Close all other open dropdowns first
            document.querySelectorAll('.color-dropdown.show').forEach(d => {
                if (d !== event.target.nextElementSibling) {
                    d.classList.remove('show');
                }
            });

            const dropdown = event.target.nextElementSibling;
            populateColorDropdown(dropdown, event.target.dataset.hex);
            dropdown.classList.toggle('show');
        } else if (event.target.classList.contains('color-option')) {
            const dropdown = event.target.parentElement;
            const selectedColorDiv = dropdown.previousElementSibling;
            const oldColor = selectedColorDiv.dataset.hex;
            const newColor = event.target.dataset.hex;

            selectedColorDiv.style.backgroundColor = event.target.style.backgroundColor;
            selectedColorDiv.dataset.hex = newColor;

            // Update grid seats with the new color
            if (oldColor) {
                document.querySelectorAll(`.grid-button[data-group-color="${oldColor}"]`).forEach(btn => {
                    btn.style.setProperty('background-color', newColor, 'important');
                    btn.dataset.groupColor = newColor;
                });
            }

            dropdown.classList.remove('show');
            updateGroupLabels();
        } else if (event.target.classList.contains('select-location-btn')) {
            const row = event.target.closest('.group-row');

            // Validate student IDs first
            const input = row.querySelector('input[name="group-students"]');
            const studentIds = input.value.split(',').map(s => s.trim()).filter(s => s);

            // Check for duplicates in other groups
            const allOtherInputs = document.querySelectorAll('input[name="group-students"]');
            const otherStudentIds = new Set();
            for (const otherInput of allOtherInputs) {
                if (otherInput !== input) {
                    const ids = otherInput.value.split(',').map(s => s.trim()).filter(s => s);
                    ids.forEach(id => otherStudentIds.add(id));
                }
            }

            const duplicates = studentIds.filter(id => otherStudentIds.has(id));
            if (duplicates.length > 0) {
                alert(`The following students are already in another group: ${duplicates.join(', ')}`);
                return;
            }

            const confirmBtn = row.querySelector('.confirm-location-btn');
            // Enable the confirm button
            confirmBtn.disabled = false;

            // Disable all other buttons and inputs
            document.querySelectorAll('button, input, select').forEach(el => {
                if (el !== saveLayoutBtn &&
                    el !== loadLayoutBtn &&
                    el !== confirmBtn &&
                    el !== loadLayoutInput) {

                    // Only disable if currently enabled (to respect previous state)
                    if (!el.disabled) {
                        el.disabled = true;
                        el.classList.add('temp-disabled');
                    }
                }
            });
            expectedGroupSize = studentIds.length;
            groupSelectionMode = true;
            currentGroupRow = row;
            currentGroupColor = row.querySelector('.selected-color').dataset.hex;

            // Count existing seats for this group
            currentGroupSelectedCount = 0;
            document.querySelectorAll('.grid-button.active').forEach(btn => {
                if (btn.dataset.groupColor === currentGroupColor) {
                    currentGroupSelectedCount++;
                }
            });

            // Unlock grid buttons for selection (only those that are active seats)
            document.querySelectorAll('.grid-button.active').forEach(btn => {
                btn.style.pointerEvents = 'auto';
                // Reset any previous custom coloring if we are re-selecting?
                // For now, assume fresh selection or overwrite.
            });

        } else if (event.target.classList.contains('confirm-location-btn')) {
            const row = event.target.closest('.group-row');
            const confirmBtn = event.target; // The button clicked is the confirm button

            // Disable the confirm button itself
            confirmBtn.disabled = true;

            // Restore previously disabled elements
            document.querySelectorAll('.temp-disabled').forEach(el => {
                el.disabled = false;
                el.classList.remove('temp-disabled');
            });

            // Disable group selection mode
            groupSelectionMode = false;
            currentGroupColor = null;
            expectedGroupSize = 0;
            currentGroupRow = null;

            // Lock grid buttons again
            document.querySelectorAll('.grid-button.active').forEach(btn => {
                btn.style.pointerEvents = 'none';
            });
        }
    });



    considerationsContainer.addEventListener('change', (event) => {
        if (event.target.name === 'condition') {
            const row = event.target.closest('.considerations-row');
            const secondIntegerInput = row.querySelector('[name="integer2"]');
            const importanceSelect = row.querySelector('[name="importance"]');
            const selectedValue = event.target.value;

            if (selectedValue === 'Front' || selectedValue === 'Back' || selectedValue === 'NearTeacher' || selectedValue === 'Tall') {
                secondIntegerInput.disabled = true;
                secondIntegerInput.value = '';
            } else {
                secondIntegerInput.disabled = false;
            }

            if (selectedValue === 'Tall') {
                importanceSelect.disabled = true;
                importanceSelect.value = 'high';
            } else {
                importanceSelect.disabled = false;
            }
        }
    });

    considerationsContainer.addEventListener('input', (event) => {
        // Validation removed as we allow text now. 
        // We could add visual cues if the text doesn't match, but complexity increases.
        // For now, let's trust the optimization step to handle resolution or failure.
    });

    document.addEventListener('keydown', (e) => {
        keySequence += e.key;
        if (keySequence.length > 5) {
            keySequence = keySequence.slice(-5);
        }
        if (keySequence.includes(GRID_WIDTH.toString())) {
            const easterEgg = document.getElementById('easterEgg');
            if (easterEgg) {
                easterEgg.style.color = '#f4f4f4';
                easterEgg.style.userSelect = 'auto';
            }
        }
    });

    // --- Core Functions ---
    function toggleSeat(button) {
        if (!teacherTableConfirmed) {
            if (button.classList.contains('active')) return;

            if (button.classList.contains('teacher-table')) {
                button.classList.remove('teacher-table');
            } else {
                if (document.querySelectorAll('.teacher-table').length < 3) {
                    button.classList.add('teacher-table');
                } else {
                    alert('You can only select up to 3 grids for the teacher\'s table.');
                }
            }
        } else {
            if (groupSelectionMode) {
                // Handle group seat selection
                if (!button.classList.contains('active')) return; // Can only select confirmed active seats

                if (button.dataset.groupColor === currentGroupColor) {
                    // Deselect
                    button.style.removeProperty('background-color');
                    delete button.dataset.groupColor;
                    currentGroupSelectedCount--;
                } else {
                    // Select
                    if (currentGroupSelectedCount < expectedGroupSize) {
                        // Check if already assigned to another group?
                        // For now, we overwrite. If we want to prevent overwriting:
                        // if (button.dataset.groupColor && button.dataset.groupColor !== currentGroupColor) return;

                        button.style.setProperty('background-color', currentGroupColor, 'important');
                        button.dataset.groupColor = currentGroupColor;
                        currentGroupSelectedCount++;
                    } else {
                        alert(`You can only select ${expectedGroupSize} seats for this group.`);
                    }
                }
                return;
            }

            if (confirmBtn.disabled) return;
            if (button.classList.contains('teacher-table')) return;

            button.classList.toggle('active');

            // If we just deactivated the seat, clear its group data too
            if (!button.classList.contains('active')) {
                button.style.removeProperty('background-color');
                delete button.dataset.groupColor;
            }
        }
    }

    function confirmTeacherSelection() {
        const teacherButtons = Array.from(document.querySelectorAll('.grid-button.teacher-table'));
        if (teacherButtons.length !== 3) {
            alert('Please select exactly 3 grids for the teacher\'s table.');
            return;
        }

        // Validate straight line (horizontal or vertical) and adjacent
        const coords = teacherButtons.map(btn => {
            const index = parseInt(btn.dataset.index, 10);
            return { row: Math.floor(index / GRID_WIDTH), col: index % GRID_WIDTH };
        });

        const rows = coords.map(c => c.row).sort((a, b) => a - b);
        const cols = coords.map(c => c.col).sort((a, b) => a - b);

        const isHorizontal = rows.every(r => r === rows[0]) && (cols[2] - cols[0] === 2) && (cols[1] - cols[0] === 1);
        const isVertical = cols.every(c => c === cols[0]) && (rows[2] - rows[0] === 2) && (rows[1] - rows[0] === 1);

        if (!isHorizontal && !isVertical) {
            alert('The teacher\'s table must be in a straight horizontal or vertical line of three adjacent tables.');
            return;
        }

        // Check for student seat overlap
        if (teacherButtons.some(btn => btn.classList.contains('active'))) {
            alert('A student seat cannot be the teacher\'s table.');
            return;
        }

        teacherTableCoords = coords;
        teacherTableConfirmed = true;
        confirmTeacherBtn.disabled = true;
        reselectTeacherBtn.disabled = false;

        teacherButtons.forEach(btn => btn.style.pointerEvents = 'none');

        if (studentCount > 0) {
            document.querySelectorAll('.grid-button:not(.active):not(.teacher-table)').forEach(btn => {
                btn.classList.add('unselected-confirmed');
                btn.style.pointerEvents = 'none';
            });
            reselectSeatsBtn.disabled = false;
            optimiseBtn.disabled = false;
            addConditionBtn.disabled = false;
            saveLayoutBtn.disabled = false;
            confirmBtn.disabled = true;
        } else {
            confirmBtn.disabled = false;
        }

        document.querySelectorAll('.teacher-option').forEach(option => {
            option.style.display = 'block';
        });
    }

    function reselectTeacher() {
        teacherTableConfirmed = false;
        const teacherButtons = document.querySelectorAll('.grid-button.teacher-table');
        teacherButtons.forEach(btn => btn.classList.remove('teacher-table'));

        document.querySelectorAll('.grid-button:not(.active)').forEach(btn => {
            btn.style.pointerEvents = 'auto';
            btn.classList.remove('unselected-confirmed');
        });

        confirmTeacherBtn.disabled = false;
        reselectTeacherBtn.disabled = true;
        reselectSeatsBtn.disabled = true;
        confirmBtn.disabled = true;
        optimiseBtn.disabled = true;
        addConditionBtn.disabled = true;
        saveLayoutBtn.disabled = true;

        document.querySelectorAll('.teacher-option').forEach(option => {
            option.style.display = 'none';
        });

        // Re-enable group inputs
        document.querySelectorAll('.groups-container input, .groups-container button').forEach(el => {
            // Only re-enable if it's not a helper button that should be controlled by state?
            // Actually, 'Select Group Location' logic handles its own state. 
            // Ideally we just reset the whole group section state or rely on confirmSelection to re-enable them.
            // For now, let's just make sure they aren't permanently locked.
            // But strictly speaking, 'Reselect Seats' resets the whole flow.
            if (!el.classList.contains('delete-group-btn')) { // Delete button visibility is managed elsewhere
                el.disabled = false;
            }
        });
        updateAddGroupButtonState();
    }

    function confirmSelection() {
        const activeButtons = Array.from(document.querySelectorAll('.grid-button.active'));
        studentCount = activeButtons.length;
        if (studentCount === 0) {
            alert('Please select at least one seat.');
            return;
        }

        selectedSeatsCoords = activeButtons.map(btn => {
            const index = parseInt(btn.dataset.index, 10);
            return { row: Math.floor(index / GRID_WIDTH), col: index % GRID_WIDTH };
        });

        document.querySelectorAll('.grid-button:not(.teacher-table)').forEach(btn => {
            if (!btn.classList.contains('active')) {
                btn.classList.add('unselected-confirmed');
            }
            btn.style.pointerEvents = 'none';
        });

        const teacherButton = document.querySelector('.grid-button.teacher-table');
        if (teacherButton) teacherButton.style.pointerEvents = 'none';


        document.querySelectorAll('.considerations-row').forEach((row) => {
            const condition = row.querySelector('[name="condition"]').value;
            const inputs = row.querySelectorAll('input, select');
            inputs.forEach(input => {
                input.disabled = false;
                if (input.type === 'number') {
                    input.max = studentCount;
                }

                // Keep integer2 disabled if the condition doesn't require it
                if (input.name === 'integer2' && (condition === 'Front' || condition === 'Back' || condition === 'NearTeacher')) {
                    input.disabled = true;
                }
            });
        });

        confirmBtn.disabled = true;
        reselectSeatsBtn.disabled = false;
        addConditionBtn.disabled = false;
        optimiseBtn.disabled = false;
        saveLayoutBtn.disabled = false;
        reselectTeacherBtn.disabled = false;

        document.querySelectorAll('.select-location-btn, .delete-group-btn').forEach(btn => {
            btn.disabled = false;
        });

        document.querySelectorAll('input[name="group-students"]').forEach(input => {
            input.disabled = false;
        });

        updateAddGroupButtonState();
    }

    function reselectSeats() {
        document.querySelectorAll('.grid-button:not(.teacher-table)').forEach(btn => {
            btn.style.pointerEvents = 'auto';
            btn.classList.remove('unselected-confirmed');
        });

        document.querySelectorAll('.optimised-seat').forEach(btn => {
            btn.classList.remove('optimised-seat');
            btn.textContent = '';
        });

        confirmBtn.disabled = false;
        reselectSeatsBtn.disabled = true;
        addConditionBtn.disabled = true;
        optimiseBtn.disabled = true;
        saveLayoutBtn.disabled = true;
        reselectTeacherBtn.disabled = true;

        document.querySelectorAll('.select-location-btn, .confirm-location-btn').forEach(btn => {
            btn.disabled = true;
        });

        // Re-enable group inputs
        document.querySelectorAll('.groups-container input, .groups-container button').forEach(el => {
            if (!el.classList.contains('delete-group-btn') &&
                !el.classList.contains('select-location-btn') &&
                !el.classList.contains('confirm-location-btn')) {
                el.disabled = false;

                // For the group student inputs, they should specifically be disabled again
                if (el.name === 'group-students') {
                    el.disabled = true;
                }
            }
        });
        updateAddGroupButtonState();
    }

    function getConsiderations() {
        return Array.from(document.querySelectorAll('.considerations-row')).map(row => {
            const student1Input = row.querySelector('[name="integer1"]').value;
            const condition = row.querySelector('[name="condition"]').value;
            const student2Input = row.querySelector('[name="integer2"]').value;
            const importance = row.querySelector('[name="importance"]').value;

            const student1Id = findStudentId(student1Input);
            const student2Id = findStudentId(student2Input);

            return {
                student1: student1Id,
                condition,
                student2: student2Id,
                importance
            };
        }).filter(c => {
            if (!c.student1) return false;
            // Far and Near conditions require a second student
            if ((c.condition === 'Far' || c.condition === 'Near') && !c.student2) {
                return false;
            }
            return true;
        });
    }

    function getRawConsiderations() {
        return Array.from(document.querySelectorAll('.considerations-row')).map(row => {
            const student1 = row.querySelector('[name="integer1"]').value;
            const condition = row.querySelector('[name="condition"]').value;
            const student2 = row.querySelector('[name="integer2"]').value;
            const importance = row.querySelector('[name="importance"]').value;

            return {
                student1,
                condition,
                student2,
                importance
            };
        }).filter(c => c.student1);
    }

    function findStudentId(input) {
        if (!input) return null;

        // If it's a direct number
        const numeric = parseInt(input, 10);
        if (!isNaN(numeric) && numeric.toString() === input.trim()) {
            return numeric;
        }

        // It's a string, try to find in class list
        const storedData = sessionStorage.getItem('classStudentData');
        if (!storedData) return null; // No class list loaded

        const studentData = JSON.parse(storedData);
        const lowerInput = input.toLowerCase().trim();

        // 1. Exact match by name
        for (const [id, data] of Object.entries(studentData)) {
            const name = typeof data === 'object' ? data.name : data;
            if (name.toLowerCase() === lowerInput) {
                return parseInt(id, 10);
            }
        }

        // 2. Starts with match
        for (const [id, data] of Object.entries(studentData)) {
            const name = typeof data === 'object' ? data.name : data;
            if (name.toLowerCase().startsWith(lowerInput)) {
                return parseInt(id, 10);
            }
        }

        // 3. Includes match
        for (const [id, data] of Object.entries(studentData)) {
            const name = typeof data === 'object' ? data.name : data;
            if (name.toLowerCase().includes(lowerInput)) {
                return parseInt(id, 10);
            }
        }

        return null;
    }

    function getGroupConstraints() {
        return getGroupsData().map(g => ({
            students: g.students.map(s => findStudentId(s)).filter(id => id !== null),
            color: g.color,
            allowedSeatIndices: g.allowedSeatIndices
        })).filter(gc => gc.students.length > 0 && gc.allowedSeatIndices.length > 0);
    }

    function getGroupsData() {
        return Array.from(document.querySelectorAll('.group-row')).map(row => {
            const input = row.querySelector('input[name="group-students"]');
            const colorHex = row.querySelector('.selected-color').dataset.hex;

            // Find allowed seat indices for this group
            const allowedSeatIndices = [];
            document.querySelectorAll(`.grid-button[data-group-color="${colorHex}"]`).forEach(btn => {
                allowedSeatIndices.push(parseInt(btn.dataset.index, 10));
            });

            return {
                students: input.value.split(',').map(s => s.trim()).filter(s => s),
                color: colorHex,
                allowedSeatIndices: allowedSeatIndices
            };
        }).filter(g => g.students.length > 0 || g.allowedSeatIndices.length > 0);
    }

    initialise();
});
