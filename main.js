import { GRID_WIDTH } from './constants.js';
import {
    initialiseDOM,
    addConditionRow,
    addGroupRow,
    updateGroupLabels,
    displayArrangement,
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
    groupList,
    considerationsContainer,
    populateColorDropdown,
    updateAddGroupButtonState
} from './dom.js';
import { runOptimisation } from './genetic-algorithm.js';
import { saveLayout, loadLayout, applyLayout } from './layout.js';

document.addEventListener('DOMContentLoaded', () => {
    let selectedSeatsCoords = [];
    let studentCount = 0;
    let teacherTableCoord = null;
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
        teacherTableCoord = null;
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

        const bestArrangement = runOptimisation(considerations, studentCount, selectedSeatsCoords, teacherTableCoord, groupConstraints);
        if (bestArrangement) {
            displayArrangement(bestArrangement, selectedSeatsCoords);
        }

        // Re-enable (optional, but usually we keep them disabled until Reset/Reselect? 
        // Based on existing patterns, we might want to keep them disabled until 'Reselect Seats' is clicked)
    });
    saveLayoutBtn.addEventListener('click', () => saveLayout(teacherTableCoord, selectedSeatsCoords, getConsiderations, getGroupsData));
    loadLayoutBtn.addEventListener('click', () => loadLayoutInput.click());
    loadLayoutInput.addEventListener('change', (event) => loadLayout(event, (layout) => applyLayout(layout, initialise, confirmTeacherSelection, confirmSelection, addConditionRow, addGroupRow)));
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
            const selectedValue = event.target.value;

            if (selectedValue === 'Front' || selectedValue === 'Back' || selectedValue === 'NearTeacher') {
                secondIntegerInput.disabled = true;
                secondIntegerInput.value = '';
            } else {
                secondIntegerInput.disabled = false;
            }
        }
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
                if (document.querySelectorAll('.teacher-table').length < 1) {
                    button.classList.add('teacher-table');
                } else {
                    alert('You can only select 1 grid for the teacher\'s table.');
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
        const teacherButton = document.querySelector('.grid-button.teacher-table');
        if (!teacherButton) {
            alert('Please select a grid for the teacher\'s table.');
            return;
        }

        if (teacherButton.classList.contains('active')) {
            alert('A student seat cannot be the teacher\'s table.');
            teacherButton.classList.remove('teacher-table');
            return;
        }

        const index = parseInt(teacherButton.dataset.index, 10);
        teacherTableCoord = { row: Math.floor(index / GRID_WIDTH), col: index % GRID_WIDTH };

        teacherTableConfirmed = true;
        confirmTeacherBtn.disabled = true;
        reselectTeacherBtn.disabled = false;

        teacherButton.style.pointerEvents = 'none';

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
        const teacherButton = document.querySelector('.grid-button.teacher-table');
        if (teacherButton) {
            teacherButton.classList.remove('teacher-table');
        }

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


        document.querySelectorAll('.considerations-row').forEach((row, rowIndex) => {
            const inputs = row.querySelectorAll('input, select');
            inputs.forEach(input => {
                input.disabled = false;
                if (input.type === 'number') {
                    input.max = studentCount;
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
            const student1 = row.querySelector('[name="integer1"]').value;
            const condition = row.querySelector('[name="condition"]').value;
            const student2 = row.querySelector('[name="integer2"]').value;
            const importance = row.querySelector('[name="importance"]').value;

            return {
                student1: student1 ? parseInt(student1, 10) : null,
                condition,
                student2: student2 ? parseInt(student2, 10) : null,
                importance
            };
        }).filter(c => c.student1);
    }

    function getGroupConstraints() {
        return getGroupsData().map(g => ({
            students: g.students.map(s => parseInt(s, 10)).filter(n => !isNaN(n)),
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
