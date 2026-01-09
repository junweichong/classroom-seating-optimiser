import { PENALTY_CONSTANTS, GRID_HEIGHT, GRID_WIDTH } from './constants.js';

function validateConsiderations(considerations, maxStudentId) {
    for (const c of considerations) {
        if (c.student1 > maxStudentId || c.student1 < 1 || (c.student2 && (c.student2 > maxStudentId || c.student2 < 1))) {
            alert(`Error: Student index must be between 1 and ${maxStudentId}.`);
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

function calculateTotalPenalty(arrangement, considerations, seatCoords, teacherTableCoord, groupConstraints) {
    let totalPenalty = 0;

    const studentPositions = new Map();
    arrangement.forEach((studentId, index) => {
        studentPositions.set(studentId, seatCoords[index]);
    });

    for (const c of considerations) {
        const constVal = PENALTY_CONSTANTS[c.importance];
        const pos1 = studentPositions.get(c.student1);
        const pos2 = c.student2 ? studentPositions.get(c.student2) : null;

        if (!pos1 || ((c.condition === 'Far' || c.condition === 'Near') && !pos2)) continue;

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

    // Apply Group Constraints Penalties
    if (groupConstraints) {
        for (const constraint of groupConstraints) {
            const allowedSet = constraint.allowedSet;
            for (const studentId of constraint.students) {
                const pos = studentPositions.get(studentId);
                if (pos) {
                    const seatGridIndex = pos.row * GRID_WIDTH + pos.col;
                    if (!allowedSet.has(seatGridIndex)) {
                        totalPenalty += 1000000; // Massive penalty for violating group constraint
                    }
                }
            }
        }
    }

    return totalPenalty;
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
    const segmentSet = new Set(segment);

    for (let i = start; i <= end; i++) {
        child[i] = parent1[i];
    }

    let childIndex = 0;
    for (let i = 0; i < size; i++) {
        const parent2Gene = parent2[i];
        if (!segmentSet.has(parent2Gene)) {
            while (child[childIndex] !== null) {
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

export function runOptimisation(considerations, studentCount, selectedSeatsCoords, teacherTableCoord, groupConstraints = []) {
    console.log('Starting optimisation with Genetic Algorithm...');
    const startTime = performance.now();
    if (!validateConsiderations(considerations, studentCount)) return null;

    // Pre-process group constraints for performance
    const processedGroupConstraints = groupConstraints.map(gc => ({
        students: gc.students,
        allowedSet: new Set(gc.allowedSeatIndices)
    }));

    const populationSize = 5000;
    const generations = 500;
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
            const penalty = calculateTotalPenalty(arrangement, considerations, selectedSeatsCoords, teacherTableCoord, processedGroupConstraints);
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

    const endTime = performance.now();
    console.log(`Optimisation finished in ${(endTime - startTime).toFixed(2)}ms. Best penalty: ${bestPenalty}`);
    return bestArrangement;
}
