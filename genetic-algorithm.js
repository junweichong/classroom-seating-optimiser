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

function calculateTotalPenalty(arrangement, considerations, seatCoords, teacherTableCoords, groupConstraints, { minRow, maxRow, minCol, maxCol, maxRowDist, maxColDist, maxDiagDist, seatSet, leftHandedStudents }) {
    let totalPenalty = 0;

    const studentPositions = new Array(arrangement.length + 1);
    arrangement.forEach((studentId, index) => {
        studentPositions[studentId] = seatCoords[index];
    });

    for (const c of considerations) {
        const constVal = PENALTY_CONSTANTS[c.importance];
        const pos1 = studentPositions[c.student1];
        const pos2 = c.student2 ? studentPositions[c.student2] : null;

        if (!pos1 || ((c.condition === 'Far' || c.condition === 'Near') && !pos2)) continue;

        let penalty = 0;
        switch (c.condition) {
            case 'Far':
                const distFar = Math.abs(pos1.row - pos2.row) + Math.abs(pos1.col - pos2.col);
                penalty = constVal * -(distFar / (maxRowDist + maxColDist));
                break;
            case 'Near':
                const distNear = Math.abs(pos1.row - pos2.row) + Math.abs(pos1.col - pos2.col);
                penalty = constVal * (distNear / (maxRowDist + maxColDist));
                break;
            case 'Front':
                penalty = constVal * (minRow === maxRow ? 0 : Math.abs(maxRow - pos1.row) / maxRowDist);
                break;
            case 'Back':
                penalty = constVal * (minRow === maxRow ? 0 : Math.abs(pos1.row - minRow) / maxRowDist);
                break;
            case 'NearTeacher':
                if (!teacherTableCoords || teacherTableCoords.length === 0) break;
                const dists = teacherTableCoords.map(coord => Math.hypot(pos1.row - coord.row, pos1.col - coord.col));
                const minDistNearTeacher = Math.min(...dists);
                penalty = constVal * (minDistNearTeacher / maxDiagDist);
                break;
            case 'Tall':
                const normDistToBack = (pos1.row - minRow) / maxRowDist;
                const normDistToLeft = (maxCol - pos1.col) / maxColDist;
                const normDistToRight = (pos1.col - minCol) / maxColDist;
                // Base penalty for being away from back/sides
                penalty = constVal * Math.min(normDistToBack, normDistToLeft + 0.1, normDistToRight + 0.1);
                break;
        }
        totalPenalty += penalty;
    }

    // Apply Handedness Penalties
    if (leftHandedStudents.length > 0) {
        const handednessPenalty = PENALTY_CONSTANTS['high']; // Use high importance for handedness

        leftHandedStudents.forEach((studentId) => {
            const pos = studentPositions[studentId];
            if (pos) {
                // Left-handed: Prefer empty space at student-left (grid-right: col + 1)
                if (seatSet.has(`${pos.row},${pos.col + 1}`)) {
                    totalPenalty += handednessPenalty;
                }
            }
        });
    }

    // Apply Group Constraints Penalties
    if (groupConstraints) {
        for (const constraint of groupConstraints) {
            const allowedSet = constraint.allowedSet;
            for (const studentId of constraint.students) {
                const pos = studentPositions[studentId];
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

export function runOptimisation(considerations, studentCount, selectedSeatsCoords, teacherTableCoords, groupConstraints = [], studentMetadata = null) {
    console.log('Starting optimisation with Genetic Algorithm...');
    if (!validateConsiderations(considerations, studentCount)) return null;

    const minRow = Math.min(...selectedSeatsCoords.map(c => c.row));
    const maxRow = Math.max(...selectedSeatsCoords.map(c => c.row));
    const minCol = Math.min(...selectedSeatsCoords.map(c => c.col));
    const maxCol = Math.max(...selectedSeatsCoords.map(c => c.col));
    const maxRowDist = maxRow - minRow || 1;
    const maxColDist = maxCol - minCol || 1;
    const maxDiagDist = Math.hypot(maxRowDist, maxColDist);
    const seatSet = new Set(selectedSeatsCoords.map(c => `${c.row},${c.col}`));
    const leftHandedStudents = [];
    if (studentMetadata) {
        for (const [id, data] of Object.entries(studentMetadata)) {
            if (data && typeof data === 'object' && data.handed && data.handed.toString().toUpperCase() === 'L') {
                leftHandedStudents.push(parseInt(id, 10));
            }
        }
    }

    const bounds = { minRow, maxRow, minCol, maxCol, maxRowDist, maxColDist, maxDiagDist, seatSet, leftHandedStudents };

    // Pre-process group constraints for performance
    const processedGroupConstraints = groupConstraints.map(gc => ({
        students: gc.students,
        allowedSet: new Set(gc.allowedSeatIndices)
    }));

    const populationSize = 500;
    const generations = 500; // Cap at 500, but we'll likely stop earlier
    const mutationRate = 0.03;
    const tournamentSize = 5; // Reduced slightly for smaller population
    const elitismCount = 2;
    const maxStaleGenerations = 50; // Stop if no improvement for 50 gens

    let population = [];
    for (let i = 0; i < populationSize; i++) {
        population.push(createRandomArrangement(studentCount));
    }

    let bestArrangement = null;
    let bestPenalty = Infinity;

    let staleGenerations = 0;

    for (let gen = 0; gen < generations; gen++) {
        const evaluatedPopulation = population.map(arrangement => {
            const penalty = calculateTotalPenalty(arrangement, considerations, selectedSeatsCoords, teacherTableCoords, processedGroupConstraints, bounds);
            return { arrangement, penalty };
        }).sort((a, b) => a.penalty - b.penalty);

        if (evaluatedPopulation[0].penalty < bestPenalty) {
            bestPenalty = evaluatedPopulation[0].penalty;
            bestArrangement = evaluatedPopulation[0].arrangement;
            staleGenerations = 0; // Reset counter on improvement
            console.log(`New best penalty in generation ${gen}: ${bestPenalty}`);
        } else {
            staleGenerations++;
        }

        if (staleGenerations >= maxStaleGenerations) {
            console.log(`Stopping early at generation ${gen} due to no improvement for ${maxStaleGenerations} generations.`);
            break;
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

    console.log(`Optimisation finished. Best penalty: ${bestPenalty}`);
    return bestArrangement;
}
