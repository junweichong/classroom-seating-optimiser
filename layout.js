import { GRID_WIDTH } from './constants.js';

export function saveLayout(teacherTableCoord, selectedSeatsCoords, getConsiderations, getGroupsData) {
    const layout = {
        teacherTable: teacherTableCoord,
        selectedSeats: selectedSeatsCoords,
        considerations: getConsiderations(),
        groups: getGroupsData ? getGroupsData() : []
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(layout, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "classroom_layout.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

export function loadLayout(event, applyLayout) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const layout = JSON.parse(e.target.result);
            applyLayout(layout);
        } catch (err) {
            alert('Error reading layout file. Make sure it is a valid layout file.');
            console.error(err);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

export function applyLayout(layout, initialise, confirmTeacherSelection, confirmSelection, addConditionRow, addGroupRow) {
    initialise();

    if (layout.teacherTable) {
        const index = layout.teacherTable.row * GRID_WIDTH + layout.teacherTable.col;
        const teacherBtn = document.querySelector(`.grid-button[data-index="${index}"]`);
        if (teacherBtn) {
            teacherBtn.classList.add('teacher-table');
            confirmTeacherSelection();
        }
    }

    if (layout.selectedSeats) {
        layout.selectedSeats.forEach(coord => {
            const index = coord.row * GRID_WIDTH + coord.col;
            const seatBtn = document.querySelector(`.grid-button[data-index="${index}"]`);
            if (seatBtn) {
                seatBtn.classList.add('active');
            }
        });
        confirmSelection();
    }

    if (layout.considerations && layout.considerations.length > 0) {
        const firstRow = document.querySelector('.considerations-row');
        if (firstRow) {
            const firstCondition = layout.considerations.shift();
            firstRow.querySelector('[name="integer1"]').value = firstCondition.student1 || '';
            firstRow.querySelector('[name="condition"]').value = firstCondition.condition || 'Far';
            firstRow.querySelector('[name="integer2"]').value = firstCondition.student2 || '';
            firstRow.querySelector('[name="importance"]').value = firstCondition.importance || 'high';

            const secondInt = firstRow.querySelector('[name="integer2"]');
            if (['Front', 'Back', 'NearTeacher'].includes(firstCondition.condition)) {
                secondInt.disabled = true;
            } else {
                secondInt.disabled = false;
            }
        }
        layout.considerations.forEach(cond => addConditionRow(cond));
    }

    if (layout.groups && layout.groups.length > 0) {
        // Clear existing group rows (initialise does this, but let's be safe - though initialise only keeps 1)
        // If layout has groups, we might need to populate the first row if it exists, or just add new ones.
        layout.groups.forEach((groupData, index) => {
            if (index === 0) {
                const firstGroupRow = document.querySelector('.group-row');
                if (firstGroupRow) {
                    populateGroupRow(firstGroupRow, groupData);
                } else {
                    addGroupRow();
                    const newRow = document.querySelector('.group-row:last-child');
                    populateGroupRow(newRow, groupData);
                }
            } else {
                addGroupRow();
                const newRow = document.querySelector('.group-row:last-child');
                populateGroupRow(newRow, groupData);
            }

            // Restore grid colors for this group
            if (groupData.allowedSeatIndices) {
                groupData.allowedSeatIndices.forEach(gridIndex => {
                    const btn = document.querySelector(`.grid-button[data-index="${gridIndex}"]`);
                    if (btn) {
                        btn.style.setProperty('background-color', groupData.color, 'important');
                        btn.dataset.groupColor = groupData.color;
                    }
                });
            }
        });
    }
}

function populateGroupRow(row, groupData) {
    const input = row.querySelector('input[name="group-students"]');
    if (input) input.value = groupData.students.join(', ');

    const selectedColorDiv = row.querySelector('.selected-color');
    if (selectedColorDiv) {
        selectedColorDiv.style.backgroundColor = groupData.color;
        selectedColorDiv.dataset.hex = groupData.color;
    }
}
