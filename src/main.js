import './style.css'

const DB_URL = import.meta.env.VITE_DB_URL;
const DB_TOKEN = import.meta.env.VITE_DB_TOKEN;

const routineData = [
  {
    day: 1, title: "Pierna & Glúteos", color: "var(--accent-1)",
    exercises: [
      { name: "Sentadilla", sets: "4 × 10–12" },
      { name: "Hip Thrust", sets: "4 × 10–12" },
      { name: "Prensa", sets: "3 × 12" },
      { name: "Zancadas", sets: "3 × 10 por pierna" },
      { name: "Extensión de cuádriceps", sets: "3 × 12–15" },
      { name: "Abducción de cadera", sets: "3 × 15–20" }
    ]
  },
  {
    day: 2, title: "Espalda & Hombros", color: "var(--accent-2)",
    exercises: [
      { name: "Jalón al pecho", sets: "4 × 10–12" },
      { name: "Remo", sets: "3 × 10–12" },
      { name: "Face Pull", sets: "3 × 12–15" },
      { name: "Press hombro", sets: "3 × 10–12" },
      { name: "Elevaciones laterales", sets: "3 × 12–15" },
      { name: "Plancha abdominal", sets: "3 × 30–45 s" }
    ]
  },
  {
    day: 3, title: "Pierna & Glúteos (Glúteo focus)", color: "var(--accent-3)",
    exercises: [
      { name: "Peso muerto rumano", sets: "4 × 10–12" },
      { name: "Sentadilla sumo", sets: "3 × 12" },
      { name: "Step‑up al banco", sets: "3 × 10 por pierna" },
      { name: "Curl femoral", sets: "3 × 12–15" },
      { name: "Patada de glúteo", sets: "3 × 15" },
      { name: "Crunch abdominal", sets: "3 × 15–20" }
    ]
  },
  {
    day: 4, title: "Pecho & Brazos", color: "var(--accent-4)",
    exercises: [
      { name: "Press pecho", sets: "3 × 10–12" },
      { name: "Aperturas de pecho", sets: "3 × 12" },
      { name: "Curl de bíceps", sets: "3 × 10–12" },
      { name: "Extensión de tríceps", sets: "3 × 10–12" },
      { name: "Curl martillo", sets: "3 × 12" },
      { name: "Tríceps en banco", sets: "3 × 12–15" }
    ]
  }
];

// State
let currentDay = 1;
let exerciseProgress = {}; // { key: { completed: bool, weight: string } }
let isSyncing = false;

// Database Operations
async function dbQuery(sql, args = []) {
  if (!DB_URL || !DB_TOKEN) {
    console.error("Faltan DB_URL o DB_TOKEN");
    return null;
  }

  // Clean URL if it has libsql://
  const cleanUrl = DB_URL.replace('libsql://', 'https://') + "/v2/pipeline";

  try {
    const response = await fetch(cleanUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            type: 'execute',
            stmt: {
              sql,
              args: args.map(a => {
                if (typeof a === 'boolean') return { type: 'integer', value: a ? 1 : 0 };
                if (typeof a === 'number') return { type: 'integer', value: a };
                if (a === null) return { type: 'null' };
                return { type: 'text', value: a.toString() };
              })
            }
          }
        ]
      })
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("DB Error:", error);
    return null;
  }
}

async function loadProgress() {
  updateSyncStatus(true);

  // Simplificamos la tabla quitando user_id
  await dbQuery(`CREATE TABLE IF NOT EXISTS progress (
    exercise_key TEXT PRIMARY KEY, 
    completed INTEGER DEFAULT 0, 
    weight TEXT DEFAULT ''
  )`);

  const data = await dbQuery("SELECT exercise_key, completed, weight FROM progress");

  if (data && data.results && data.results[0].type === 'ok') {
    const rows = data.results[0].response.result.rows;
    exerciseProgress = {};
    rows.forEach(row => {
      exerciseProgress[row[0].value] = {
        completed: row[1].value === 1,
        weight: row[2].value || ""
      };
    });
  }
  updateSyncStatus(false);
  renderRoutine();
}

async function toggleExercise(day, exerciseName) {
  const key = `${day}-${exerciseName}`;
  const current = exerciseProgress[key] || { completed: false, weight: "" };
  const newState = !current.completed;

  exerciseProgress[key] = { ...current, completed: newState };
  renderRoutine();

  updateSyncStatus(true);
  await dbQuery(
    "INSERT INTO progress (exercise_key, completed, weight) VALUES (?, ?, ?) ON CONFLICT(exercise_key) DO UPDATE SET completed = excluded.completed",
    [key, newState, current.weight]
  );
  updateSyncStatus(false);
}

async function updateWeight(day, exerciseName, weight) {
  const key = `${day}-${exerciseName}`;
  const current = exerciseProgress[key] || { completed: false, weight: "" };

  exerciseProgress[key] = { ...current, weight: weight };

  updateSyncStatus(true);
  await dbQuery(
    "INSERT INTO progress (exercise_key, completed, weight) VALUES (?, ?, ?) ON CONFLICT(exercise_key) DO UPDATE SET weight = excluded.weight",
    [key, current.completed, weight]
  );
  updateSyncStatus(false);
}

function updateSyncStatus(syncing) {
  isSyncing = syncing;
  const footerStatus = document.getElementById('sync-status');
  if (footerStatus) {
    footerStatus.innerHTML = syncing ? "🔄 Sincronizando..." : "✨ LuFit Cloud Activo";
  }
}

function renderRoutine() {
  const container = document.getElementById('routine-content');
  const dayData = routineData.find(d => d.day === currentDay);

  if (!dayData) return;

  const html = `
    <div class="day-header">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span class="day-tag" style="background: ${dayData.color}20; color: ${dayData.color}">DÍA ${dayData.day}</span>
          <h2>${dayData.title}</h2>
        </div>
        <button class="reset-btn" onclick="window.resetDay(${currentDay})" title="Reiniciar Día">🔄</button>
      </div>
    </div>
    
    <div class="exercise-list">
      ${dayData.exercises.map(ex => {
    const prog = exerciseProgress[`${currentDay}-${ex.name}`] || { completed: false, weight: "" };
    return `
          <div class="exercise-card ${prog.completed ? 'completed' : ''}" 
               style="border-left: 4px solid ${prog.completed ? 'transparent' : dayData.color}">
            
            <div class="exercise-main" onclick="window.toggleExercise(${currentDay}, '${ex.name}')">
              <div class="exercise-info">
                <span class="exercise-name">${ex.name}</span>
                <span class="exercise-sets">${ex.sets}</span>
              </div>
              <div class="checkbox-wrapper">
                <span class="checkmark" style="color: ${dayData.color}"></span>
              </div>
            </div>

            <div class="exercise-extra">
               <input type="text" 
                      placeholder="Peso (kg)" 
                      value="${prog.weight}" 
                      onchange="window.updateWeight(${currentDay}, '${ex.name}', this.value)"
                      onclick="event.stopPropagation()">
            </div>
          </div>
        `;
  }).join('')}
    </div>
  `;

  container.innerHTML = html;
}

window.resetDay = async (day) => {
  if (!confirm("¿Reiniciar el progreso de este día?")) return;

  const dayExercises = routineData.find(d => d.day === day).exercises;
  updateSyncStatus(true);

  for (const ex of dayExercises) {
    const key = `${day}-${ex.name}`;
    exerciseProgress[key] = { completed: false, weight: "" };
    await dbQuery("DELETE FROM progress WHERE exercise_key = ?", [key]);
  }

  updateSyncStatus(false);
  renderRoutine();
};

window.toggleExercise = toggleExercise;
window.updateWeight = updateWeight;

document.querySelectorAll('.day-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.day-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentDay = parseInt(tab.dataset.day);
    renderRoutine();
  });
});

// Setup Sync Status in UI
const footer = document.querySelector('.footer');
if (footer) {
  footer.innerHTML = `
    <p id="sync-status">✨ Cargando LuFit...</p>
    <p style="font-size: 0.7rem; margin-top: 8px; opacity: 0.5;">LuFit Cloud Connect</p>
  `;
}

loadProgress();
