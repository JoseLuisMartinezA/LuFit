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
let exerciseProgress = {}; // Stores { completed: bool, weight: string }
let isSyncing = false;

function getUserId() {
  let id = localStorage.getItem('lufit_user_id');
  if (!id) {
    id = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('lufit_user_id', id);
  }
  return id;
}

const USER_ID = getUserId();

// Database Operations
async function dbQuery(sql, args = []) {
  if (!DB_URL || !DB_TOKEN) {
    console.error("Faltan DB_URL o DB_TOKEN en el archivo .env.local");
    return null;
  }
  try {
    const response = await fetch(DB_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          {
            type: 'execute', stmt: {
              sql, args: args.map(a =>
                typeof a === 'boolean' ? { value: a ? 1 : 0 } :
                  typeof a === 'number' ? { value: a } :
                    a === null ? { value: null } :
                      { value: a.toString() }
              )
            }
          }
        ]
      })
    });
    return await response.json();
  } catch (error) {
    console.error("DB Error:", error);
    return null;
  }
}

async function loadProgress() {
  updateSyncStatus(true);

  // Create table if not exists AND alter it to add weight column if it doesn't exist
  await dbQuery(`CREATE TABLE IF NOT EXISTS progress (
    user_id TEXT, 
    exercise_key TEXT, 
    completed INTEGER, 
    weight TEXT,
    PRIMARY KEY (user_id, exercise_key)
  )`);

  const data = await dbQuery("SELECT exercise_key, completed, weight FROM progress WHERE user_id = ?", [USER_ID]);

  if (data && data.results && data.results[0].response.result) {
    const rows = data.results[0].response.result.rows;
    exerciseProgress = {};
    rows.forEach(row => {
      // row[0] = key, row[1] = completed, row[2] = weight
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

  // Optimistic UI update
  exerciseProgress[key] = { ...current, completed: newState };
  renderRoutine();

  updateSyncStatus(true);
  await dbQuery(
    "INSERT INTO progress (user_id, exercise_key, completed, weight) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, exercise_key) DO UPDATE SET completed = excluded.completed",
    [USER_ID, key, newState ? 1 : 0, current.weight]
  );
  updateSyncStatus(false);
}

async function updateWeight(day, exerciseName, weight) {
  const key = `${day}-${exerciseName}`;
  const current = exerciseProgress[key] || { completed: false, weight: "" };

  exerciseProgress[key] = { ...current, weight: weight };

  updateSyncStatus(true);
  await dbQuery(
    "INSERT INTO progress (user_id, exercise_key, completed, weight) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, exercise_key) DO UPDATE SET weight = excluded.weight",
    [USER_ID, key, current.completed ? 1 : 0, weight]
  );
  updateSyncStatus(false);
}

function updateSyncStatus(syncing) {
  isSyncing = syncing;
  const footerStatus = document.getElementById('sync-status');
  if (footerStatus) {
    footerStatus.innerHTML = syncing ? "🔄 Sincronizando..." : "✨ En la nube";
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
  if (!confirm("¿Seguro que quieres reiniciar el progreso de este día?")) return;

  const dayExercises = routineData.find(d => d.day === day).exercises;
  updateSyncStatus(true);

  for (const ex of dayExercises) {
    const key = `${day}-${ex.name}`;
    exerciseProgress[key] = { completed: false, weight: "" };
    await dbQuery("DELETE FROM progress WHERE user_id = ? AND exercise_key = ?", [USER_ID, key]);
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
    <p style="font-size: 0.7rem; margin-top: 8px; opacity: 0.5;">ID de Sesión: ${USER_ID}</p>
  `;
}

loadProgress();
