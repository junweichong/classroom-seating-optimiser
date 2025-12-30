document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Declarations ---
    const gridContainer = document.getElementById('myGrid');
    const confirmTeacherBtn = document.getElementById('confirmTeacherBtn');
    const reselectTeacherBtn = document.getElementById('reselectTeacherBtn');
    const reselectSeatsBtn = document.getElementById('reselectSeatsBtn');
    const confirmBtn = document.getElementById('confirmBtn');
    const resetBtn = document.getElementById('resetBtn');
    const addConditionBtn = document.getElementById('addConditionBtn');
    const optimiseBtn = document.getElementById('optimiseBtn');
    const saveLayoutBtn = document.getElementById('saveLayoutBtn');
    const loadLayoutBtn = document.getElementById('loadLayoutBtn');
    const loadLayoutInput = document.getElementById('loadLayoutInput');
    const considerationsContainer = document.querySelector('.considerations-container');
    const easterEgg = document.getElementById('easterEgg');

    const GRID_WIDTH = 15;
    const GRID_HEIGHT = 13;
    const GRID_SIZE = GRID_WIDTH * GRID_HEIGHT;

    let selectedSeatsCoords = [];
    let studentCount = 0;
    let teacherTableCoord = null;
    let teacherTableConfirmed = false;
    let keySequence = '';

    // --- Initialisation ---
    const initialise = () => {
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

        selectedSeatsCoords = [];
        studentCount = 0;
        teacherTableCoord = null;
        teacherTableConfirmed = false;
        
        if (easterEgg) {
            easterEgg.style.color = 'transparent';
            easterEgg.style.userSelect = 'none';
        }
        keySequence = '';
    };

    // --- Event Listeners ---
    confirmTeacherBtn.addEventListener('click', confirmTeacherSelection);
    reselectTeacherBtn.addEventListener('click', reselectTeacher);
    reselectSeatsBtn.addEventListener('click', reselectSeats);
    confirmBtn.addEventListener('click', confirmSelection);
    resetBtn.addEventListener('click', initialise);
    addConditionBtn.addEventListener('click', () => addConditionRow());
    optimiseBtn.addEventListener('click', runOptimisation);
    saveLayoutBtn.addEventListener('click', saveLayout);
    loadLayoutBtn.addEventListener('click', () => loadLayoutInput.click());
    loadLayoutInput.addEventListener('change', loadLayout);

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
        if (keySequence.length > 2) {
            keySequence = keySequence.slice(-2);
        }
        if (keySequence === '15') {
            if (easterEgg) {
                easterEgg.style.color = '#f4f4f4';
                easterEgg.style.userSelect = 'auto';
            }
        }
    });

    // --- Core Functions ---
    function toggleSeat(button) {
        if (!teacherTableConfirmed) {
            if(button.classList.contains('active')) return;

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
            if (confirmBtn.disabled) return;
            if (button.classList.contains('teacher-table')) return;
            button.classList.toggle('active');
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
        if(teacherButton) teacherButton.style.pointerEvents = 'none';


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
    }

    function addConditionRow(condition = null) {
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

    // --- Layout Save/Load ---
    function saveLayout() {
        const layout = {
            teacherTable: teacherTableCoord,
            selectedSeats: selectedSeatsCoords,
            considerations: getConsiderations()
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(layout, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "classroom_layout.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    }

    function loadLayout(event) {
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
        loadLayoutInput.value = '';
    }

    function applyLayout(layout) {
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
            if(firstRow) {
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
    }
    
    // --- OPTIMISATION LOGIC (Genetic Algorithm) ---
    function runOptimisation() {
        console.log('Starting optimisation with Genetic Algorithm...');
        const considerations = getConsiderations();
        if (!validateConsiderations(considerations, studentCount)) return;

        const populationSize = 250;
        const generations = 250;
        const mutationRate = 0.03;
        const tournamentSize = 8;
        const elitismCount = 2;

        let population = [];
        for (let i = 0; i < populationSize; i++) {
            population.push(createRandomArrangement(studentCount));
        }

        let bestArrangement = null;
        let bestPenalty = Infinity;

        for (let gen = 0; gen < generations; gen++) {
            const evaluatedPopulation = population.map(arrangement => {
                const penalty = calculateTotalPenalty(arrangement, considerations, selectedSeatsCoords);
                return { arrangement, penalty };
            }).sort((a, b) => a.penalty - b.penalty);

            if (evaluatedPopulation[0].penalty < bestPenalty) {
                bestPenalty = evaluatedPopulation[0].penalty;
                bestArrangement = evaluatedPopulation[0].arrangement;
                console.log(`New best penalty in generation ${gen}: ${bestPenalty}`);
            }
            
            const newPopulation = [];

            for (let i = 0; i < elitismCount; i++) {
                newPopulation.push(evaluatedPopulation[i].arrangement);
            }

            while (newPopulation.length < populationSize) {
                const parent1 = tournamentSelection(evaluatedPopulation, tournamentSize);
                const parent2 = tournamentSelection(evaluatedPopulation, tournamentSize);

                let child = orderedCrossover(parent1, parent2);

                if (Math.random() < mutationRate) {
                    child = mutate(child);
                }
                newPopulation.push(child);
            }
            population = newPopulation;
        }

        displayArrangement(bestArrangement, selectedSeatsCoords);
        console.log(`Optimisation finished. Best penalty: ${bestPenalty}`);
    }

    function tournamentSelection(evaluatedPopulation, size) {
        let best = null;
        let bestPenalty = Infinity;
        for (let i = 0; i < size; i++) {
            const randomIndex = Math.floor(Math.random() * evaluatedPopulation.length);
            const individual = evaluatedPopulation[randomIndex];
            if (individual.penalty < bestPenalty) {
                bestPenalty = individual.penalty;
                best = individual.arrangement;
            }
        }
        return best;
    }

    function orderedCrossover(parent1, parent2) {
        const size = parent1.length;
        const start = Math.floor(Math.random() * size);
        const end = Math.floor(Math.random() * (size - start)) + start;
        
        const child = Array(size).fill(null);
        const segment = parent1.slice(start, end + 1);
        
        for(let i = start; i <= end; i++) {
            child[i] = parent1[i];
        }

        let childIndex = 0;
        for (let i = 0; i < size; i++) {
            const parent2Gene = parent2[i];
            if (!segment.includes(parent2Gene)) {
                while(child[childIndex] !== null) {
                    childIndex++;
                }
                child[childIndex] = parent2Gene;
            }
        }
        return child;
    }

    function mutate(arrangement) {
        const newArrangement = [...arrangement];
        const i = Math.floor(Math.random() * newArrangement.length);
        let j = Math.floor(Math.random() * newArrangement.length);
        while (i === j) {
            j = Math.floor(Math.random() * newArrangement.length);
        }
        [newArrangement[i], newArrangement[j]] = [newArrangement[j], newArrangement[i]];
        return newArrangement;
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

    function validateConsiderations(considerations, maxStudentId) {
        for (const c of considerations) {
            if (c.student1 > maxStudentId || (c.student2 && c.student2 > maxStudentId)) {
                alert(`Error: Student index in considerations cannot be greater than the number of seats (${maxStudentId}).`);
                return false;
            }
        }
        return true;
    }

    function createRandomArrangement(numStudents) {
        const students = Array.from({ length: numStudents }, (_, i) => i + 1);
        for (let i = students.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [students[i], students[j]] = [students[j], students[i]];
        }
        return students;
    }

    function calculateTotalPenalty(arrangement, considerations, seatCoords) {
        let totalPenalty = 0;
        const penaltyConstants = { high: 1000, medium: 100, low: 10 };

        const studentPositions = new Map();
        arrangement.forEach((studentId, index) => {
            studentPositions.set(studentId, seatCoords[index]);
        });

        for (const c of considerations) {
            const constVal = penaltyConstants[c.importance];
            const pos1 = studentPositions.get(c.student1);
            const pos2 = c.student2 ? studentPositions.get(c.student2) : null;
            
            if (!pos1 || (c.student2 && !pos2)) continue;

            let penalty = 0;
            switch (c.condition) {
                case 'Far':
                    const distFar = Math.hypot(pos1.row - pos2.row, pos1.col - pos2.col);
                    penalty = constVal * -distFar;
                    break;
                case 'Near':
                    const distNear = Math.hypot(pos1.row - pos2.row, pos1.col - pos2.col);
                    penalty = constVal * distNear;
                    break;
                case 'Front':
                    penalty = constVal * (GRID_HEIGHT - 1 - pos1.row);
                    break;
                case 'Back':
                    penalty = constVal * pos1.row;
                    break;
                case 'NearTeacher':
                    if (!teacherTableCoord) break;
                    const distNearTeacher = Math.hypot(pos1.row - teacherTableCoord.row, pos1.col - teacherTableCoord.col);
                    penalty = constVal * distNearTeacher;
                    break;
            }
            totalPenalty += penalty;
        }
        return totalPenalty;
    }

    function displayArrangement(arrangement, seatCoords) {
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

    initialise();
});
