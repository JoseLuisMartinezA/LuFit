
import { dbQuery, dbBatch } from './db.js';
import { state } from './state.js';
import { loadRoutines, setActiveRoutine, showAlert, updateSyncStatus } from './features.js';

export function showAIPlannerModal() {
    if (state.routines.length >= 3) {
        showAlert("Límite de rutinas alcanzado (3/3).");
        return;
    }

    // Remove existing if any
    const existing = document.getElementById('ai-planner-modal');
    if (existing) existing.remove();

    const html = `
    <div class="modal" id="ai-planner-modal" style="display: flex;">
        <div class="modal-content">
            <div class="modal-header">
                <h3>Asistente Lu 🤖</h3>
                <button class="close-modal" onclick="document.getElementById('ai-planner-modal').remove()">&times;</button>

            </div>
            <div class="modal-body">
                <p style="margin-bottom: 1.5rem; color: var(--text-secondary); line-height: 1.5;">
                   Hola, soy Lu. Analizaré tu perfil (${state.userProfile ? state.userProfile.gender : 'Usuario'}) y crearé un plan 100% personalizado para ti.
                </p>

                <div class="input-group">
                    <label>¿Cuántos días a la semana?</label>
                    <select id="ai-days" class="styled-select">
                        <option value="3">3 Días (Full Body)</option>
                        <option value="4">4 Días (Torso / Pierna)</option>
                        <option value="5">5 Días (Frecuencia Mixta)</option>
                    </select>
                </div>
                
                 <div class="input-group">
                    <label>Enfoque Principal (Partes)</label>
                    <select id="ai-focus" class="styled-select">
                        <option value="balanced">Equilibrado (Recomendado)</option>
                        <option value="upper">Prioridad Tren Superior (Pecho/Espalda/Brazos)</option>
                        <option value="lower">Prioridad Tren Inferior (Pierna/Glúteo)</option>
                    </select>
                </div>

                <div class="input-group">
                    <label>Nivel de Entrenamiento</label>
                    <select id="ai-level" class="styled-select">
                        <option value="Principiante">Principiante (Pocos meses)</option>
                        <option value="Intermedio">Intermedio (1-2 años)</option>
                        <option value="Avanzado">Avanzado (+3 años)</option>
                    </select>
                </div>

                <div class="input-group">
                    <label>Objetivo Principal</label>
                    <select id="ai-goal" class="styled-select">
                        <option value="General">Salud General / Mantenimiento</option>
                        <option value="Hipertrofia">Ganar Músculo (Hipertrofia)</option>
                        <option value="Fuerza">Fuerza Básica</option>
                        <option value="Perdida">Pérdida de Grasa</option>
                    </select>
                </div>

                <button id="btn-generate-ai" class="primary-btn" style="margin-top: 10px; background: linear-gradient(135deg, #6366f1, #8b5cf6);">
                    ¡Vamos allá! 🚀
                </button>
            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);

    document.getElementById('btn-generate-ai').onclick = async () => {
        const btn = document.getElementById('btn-generate-ai');
        btn.disabled = true;
        btn.innerText = "Lu está analizando...";

        const days = parseInt(document.getElementById('ai-days').value);
        const goal = document.getElementById('ai-goal').value;
        const level = document.getElementById('ai-level').value;
        const focus = document.getElementById('ai-focus').value;

        try {
            await generateSmartRoutine(days, goal, level, focus);
            document.getElementById('ai-planner-modal').remove();
        } catch (e) {
            console.error(e);
            showAlert("Hubo un error al generar la rutina.");
            btn.disabled = false;
            btn.innerText = "¡Vamos allá! 🚀";
        }
    };
}

async function generateSmartRoutine(days, goal, level, focus) {
    updateSyncStatus(true);

    // 1. Create Routine container
    const now = new Date().toISOString();
    const name = `Plan ${goal} (${days} días)`;

    const res = await dbQuery("INSERT INTO routines (user_id, name, is_active, num_days, created_at) VALUES (?, ?, ?, ?, ?)",
        [state.currentUser.id, name, 1, 4, now]);

    if (!res || res.results[0].type !== 'ok') throw new Error("Failed to create routine");

    const routineId = parseInt(res.results[0].response.result.last_insert_rowid);

    // 2. Create the first Week
    const weekRes = await dbQuery("INSERT INTO weeks (routine_id, user_id, name) VALUES (?, ?, ?)",
        [routineId, state.currentUser.id, "Semana 1"]);
    const weekId = parseInt(weekRes.results[0].response.result.last_insert_rowid);

    // 3. Define Structure
    let structure = [];

    // LOGIC for Structure based on Focus
    // We treat 'balanced' as the standard logic previously defined

    if (days === 3) {
        if (focus === 'lower') {
            structure = [
                { day: 1, type: 'Pierna Énfasis', focus: ['Pierna', 'Core'] },
                { day: 2, type: 'Descanso', focus: [] },
                { day: 3, type: 'Torso Completo', focus: ['Pecho', 'Espalda', 'Hombro', 'Tríceps'] },
                { day: 4, type: 'Descanso', focus: [] },
                { day: 5, type: 'Full Body + Glúteo', focus: ['Pierna', 'Hombro', 'Espalda', 'Glúteo'] }, // Mapping Gluteo to Pierna usually, but if library has it separate... in SEED it's mostly Pierna or specialized names.
                { day: 6, type: 'Descanso', focus: [] },
                { day: 7, type: 'Descanso', focus: [] }
            ];
        } else {
            // Standard Full Body
            structure = [
                { day: 1, type: 'Full Body A', focus: ['Pecho', 'Espalda', 'Pierna', 'Hombro'] },
                { day: 2, type: 'Descanso', focus: [] },
                { day: 3, type: 'Full Body B', focus: ['Pierna', 'Pecho', 'Espalda', 'Tríceps'] },
                { day: 4, type: 'Descanso', focus: [] },
                { day: 5, type: 'Full Body C', focus: ['Hombro', 'Bíceps', 'Pierna', 'Core'] },
                { day: 6, type: 'Descanso', focus: [] },
                { day: 7, type: 'Descanso', focus: [] }
            ];
        }
    } else if (days === 4) {
        if (focus === 'upper') {
            structure = [
                { day: 1, type: 'Torso A (Pecho/Espalda)', focus: ['Pecho', 'Espalda'] },
                { day: 2, type: 'Pierna', focus: ['Pierna', 'Core'] },
                { day: 3, type: 'Descanso', focus: [] },
                { day: 4, type: 'Hombro y Brazos', focus: ['Hombro', 'Bíceps', 'Tríceps'] },
                { day: 5, type: 'Torso B (Pump)', focus: ['Pecho', 'Espalda', 'Hombro'] },
                { day: 6, type: 'Descanso', focus: [] },
                { day: 7, type: 'Descanso', focus: [] }
            ];
        } else {
            // Standard Upper/Lower
            structure = [
                { day: 1, type: 'Torso A (Fuerza)', focus: ['Pecho', 'Espalda', 'Hombro'] },
                { day: 2, type: 'Pierna A', focus: ['Pierna', 'Core'] },
                { day: 3, type: 'Descanso', focus: [] },
                { day: 4, type: 'Torso B (Hipertrofia)', focus: ['Pecho', 'Espalda', 'Bíceps', 'Tríceps'] },
                { day: 5, type: 'Pierna B', focus: ['Pierna', 'Core'] },
                { day: 6, type: 'Descanso', focus: [] },
                { day: 7, type: 'Descanso', focus: [] }
            ];
        }
    } else {
        // 5 Days
        structure = [
            { day: 1, type: 'Empuje (Push)', focus: ['Pecho', 'Hombro', 'Tríceps'] },
            { day: 2, type: 'Tracción (Pull)', focus: ['Espalda', 'Bíceps', 'Core'] },
            { day: 3, type: 'Pierna (Legs)', focus: ['Pierna'] },
            { day: 4, type: 'Descanso', focus: [] },
            { day: 5, type: 'Torso Superior', focus: ['Pecho', 'Espalda', 'Hombro'] },
            { day: 6, type: 'Pierna Completa', focus: ['Pierna', 'Core'] },
            { day: 7, type: 'Descanso', focus: [] }
        ];
    }

    // 4. Fill Days
    let dayIndex = 0;
    for (const dayPlan of structure) {
        if (dayPlan.type === 'Descanso') continue;

        dayIndex++;
        // Create Day Title
        await dbQuery("INSERT INTO day_titles (week_id, day_index, title, day_order) VALUES (?, ?, ?, ?)",
            [weekId, dayIndex, dayPlan.type, dayIndex - 1]);

        // Select Exercises
        let order = 0;
        for (const muscle of dayPlan.focus) {
            // Use level for difficulty. 
            // If level is 'Principiante', stick to it. If 'Avanzado', can use 'Intermedio' or 'Avanzado'.

            let difficultyTarget = level; // 'Principiante', 'Intermedio' ...

            // Map Gluteo special case to Pierna if not exists as separate muscle in DB
            let searchMuscle = muscle;
            if (muscle === 'Glúteo') searchMuscle = 'Pierna'; // Fallback if Gluteo not in DB types

            const exList = await getExercisesForMuscle(searchMuscle, difficultyTarget, 2);

            for (const ex of exList) {
                order++;
                const sets = goal === 'Fuerza' ? '5 × 5' : (goal === 'Hipertrofia' ? '3 × 10' : '3 × 12');

                await dbQuery("INSERT INTO exercises (week_id, day_index, exercise_library_id, series_target, weight, order_index, completed) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [weekId, dayIndex, ex.id, sets, "", order, 0]);
            }
        }
    }

    updateSyncStatus(false);

    // 5. Load and Switch
    await loadRoutines();
    await setActiveRoutine(routineId);
}

async function getExercisesForMuscle(muscle, difficulty, limit) {
    // If strict match fails, we fallback.
    // Logic: Try exact difficulty. 
    // If 'Avanzado' and no results, try 'Intermedio'.
    // If 'Principiante' and no results, try 'Intermedio'.

    let res = await dbQuery("SELECT id FROM exercise_library WHERE target_muscle = ? AND difficulty_level = ? ORDER BY RANDOM() LIMIT ?",
        [muscle, difficulty, limit]);

    let rows = (res && res.results[0].type === 'ok') ? res.results[0].response.result.rows : [];

    if (rows.length < limit) {
        // Fallback logic
        const fallbackDiff = difficulty === 'Principiante' ? 'Intermedio' : 'Intermedio'; // Always fallback to intermedio basically
        const needed = limit - rows.length;

        const res2 = await dbQuery("SELECT id FROM exercise_library WHERE target_muscle = ? AND difficulty_level = ? ORDER BY RANDOM() LIMIT ?",
            [muscle, fallbackDiff, needed]);

        if (res2 && res2.results[0].type === 'ok') {
            rows = rows.concat(res2.results[0].response.result.rows);
        }
    }

    return rows.map(r => ({ id: r[0].value }));
}
