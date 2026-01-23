import './style.css'

const DB_URL = "https://lufit-notorious.aws-eu-west-1.turso.io/v2/pipeline";
const DB_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjkxNzcyNjQsImlkIjoiOWJiN2U1YWQtNDE0YS00NjFjLWI0MDAtNGFhNjdjN2IwOTJhIiwicmlkIjoiMTVlNTYzZDEtNzUyOC00NDAyLTkzNWMtNDdhNWMxNDc1ZmNlIn0.3_HXFTYeIiapctQU2JLV2aGNXtRcHfjCso1xiPakRQxzoDQArJyQZTUOPmTIkmmWlzS0c7Jdo7EvGYSV3OFcBQ";

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
let completedExercises = {};
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
async function dbQuery(sql, args = {}) {
  try {
    const response = await fetch(DB_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          { type: 'execute', stmt: { sql, args } }
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
  const data = await dbQuery("SELECT exercise_key, completed FROM progress WHERE user_id = ?", [USER_ID]);

  if (data && data.results && data.results[0].response.result) {
    const rows = data.results[0].response.result.rows;
    completedExercises = {};
    rows.forEach(row => {
      // Turso returns rows as arrays or objects depending on the driver, 
      // with the HTTP API they are usually in result.rows as arrays
      completedExercises[row[0].value] = row[1].value === 1;
    });
  }
  updateSyncStatus(false);
  renderRoutine();
}

async function toggleExercise(day, exerciseName) {
  const key = `${day}-${exerciseName}`;
  const newState = !completedExercises[key];

  // Optimistic UI update
  completedExercises[key] = newState;
  renderRoutine();

  updateSyncStatus(true);
  await dbQuery(
    "INSERT INTO progress (user_id, exercise_key, completed) VALUES (?, ?, ?) ON CONFLICT(user_id, exercise_key) DO UPDATE SET completed = excluded.completed",
    [USER_ID, key, newState ? 1 : 0]
  );
  updateSyncStatus(false);
}

function updateSyncStatus(syncing) {
  isSyncing = syncing;
  const footer = document.querySelector('.footer p');
  if (footer) {
    footer.innerHTML = syncing ? "🔄 Sincronizando con la nube..." : "✨ Progreso guardado en la nube";
  }
}

function renderRoutine() {
  const container = document.getElementById('routine-content');
  const dayData = routineData.find(d => d.day === currentDay);

  if (!dayData) return;

  const html = `
    <div class="day-header">
      <span class="day-tag" style="background: ${dayData.color}20; color: ${dayData.color}">DÍA ${dayData.day}</span>
      <h2>${dayData.title}</h2>
    </div>
    
    <div class="exercise-list">
      ${dayData.exercises.map(ex => {
    const isCompleted = completedExercises[`${currentDay}-${ex.name}`];
    return `
          <div class="exercise-card ${isCompleted ? 'completed' : ''}" 
               style="color: ${isCompleted ? 'var(--text-secondary)' : 'inherit'}; border-left: 4px solid ${isCompleted ? 'transparent' : dayData.color}"
               onclick="window.toggleExercise(${currentDay}, '${ex.name}')">
            <div class="exercise-info">
              <span class="exercise-name">${ex.name}</span>
              <span class="exercise-sets">${ex.sets}</span>
            </div>
            <div class="checkbox-wrapper">
              <span class="checkmark" style="color: ${dayData.color}"></span>
            </div>
          </div>
        `;
  }).join('')}
    </div>
  `;

  container.innerHTML = html;
}

// Global scope for onclick
window.toggleExercise = toggleExercise;

// Tab Interaction
document.querySelectorAll('.day-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.day-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentDay = parseInt(tab.dataset.day);
    renderRoutine();
  });
});

// Initial Load
loadProgress();
