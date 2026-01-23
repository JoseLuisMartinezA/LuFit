import './style.css'

const DB_URL = import.meta.env.VITE_DB_URL;
const DB_TOKEN = import.meta.env.VITE_DB_TOKEN;

const DEFAULT_ROUTINE = [
  {
    day: 1, title: "Pierna & Glúteos", color: "var(--accent-1)",
    exs: [
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
    exs: [
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
    exs: [
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
    exs: [
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
let weeks = [];
let currentWeekId = null;
let currentDay = 1;
let currentExercises = [];

// Database Operations
async function dbQuery(sql, args = []) {
  if (!DB_URL || !DB_TOKEN) return null;
  const cleanUrl = DB_URL.replace('libsql://', 'https://') + "/v2/pipeline";
  try {
    const response = await fetch(cleanUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${DB_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          type: 'execute',
          stmt: {
            sql,
            args: args.map(a => {
              if (typeof a === 'boolean') return { type: 'integer', value: a ? 1 : 0 };
              if (typeof a === 'number') return { type: 'integer', value: a };
              return { type: 'text', value: a.toString() };
            })
          }
        }]
      })
    });
    return await response.json();
  } catch (error) {
    console.error("DB Error:", error);
    return null;
  }
}

async function initApp() {
  updateSyncStatus(true);

  await dbQuery('CREATE TABLE IF NOT EXISTS weeks (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)');
  await dbQuery('CREATE TABLE IF NOT EXISTS exercises (id INTEGER PRIMARY KEY AUTOINCREMENT, week_id INTEGER, day_index INTEGER, name TEXT, sets TEXT, completed INTEGER DEFAULT 0, weight TEXT DEFAULT \'\')');

  const weeksRes = await dbQuery("SELECT id, name FROM weeks ORDER BY id ASC");
  if (weeksRes && weeksRes.results[0].type === 'ok') {
    weeks = weeksRes.results[0].response.result.rows.map(r => ({ id: r[0].value, name: r[1].value }));
  }

  if (weeks.length === 0) {
    await createWeek("Semana 1");
  } else {
    currentWeekId = weeks[weeks.length - 1].id;
    await loadExercises();
  }

  renderWeekSelector();
  updateSyncStatus(false);
}

async function createWeek(name) {
  const res = await dbQuery("INSERT INTO weeks (name) VALUES (?)", [name]);
  const newId = res.results[0].response.result.last_insert_rowid;

  // Siempre sembrar con la rutina por defecto si es una semana nueva
  for (const day of DEFAULT_ROUTINE) {
    for (const ex of day.exs) {
      await dbQuery("INSERT INTO exercises (week_id, day_index, name, sets) VALUES (?, ?, ?, ?)", [newId, day.day, ex.name, ex.sets]);
    }
  }

  weeks.push({ id: newId, name });
  currentWeekId = newId;
  await loadExercises();
  renderWeekSelector();
  renderRoutine();
}

async function loadExercises() {
  if (!currentWeekId) return;
  const res = await dbQuery("SELECT id, day_index, name, sets, completed, weight FROM exercises WHERE week_id = ? AND day_index = ?", [currentWeekId, currentDay]);
  if (res && res.results[0].type === 'ok') {
    currentExercises = res.results[0].response.result.rows.map(r => ({
      id: r[0].value,
      day: r[1].value,
      name: r[2].value,
      sets: r[3].value,
      completed: r[4].value === 1,
      weight: r[5].value || ""
    }));
  }
}

function renderWeekSelector() {
  const select = document.getElementById('week-select');
  select.innerHTML = weeks.map(w => `<option value="${w.id}" ${w.id === currentWeekId ? 'selected' : ''}>${w.name}</option>`).join('');
}

async function toggleExercise(id, completed) {
  const newState = !completed;
  const ex = currentExercises.find(e => e.id === id);
  if (ex) ex.completed = newState;
  renderRoutine();

  updateSyncStatus(true);
  await dbQuery("UPDATE exercises SET completed = ? WHERE id = ?", [newState, id]);
  updateSyncStatus(false);
}

async function updateWeight(id, weight) {
  const ex = currentExercises.find(e => e.id === id);
  if (ex) ex.weight = weight;

  updateSyncStatus(true);
  await dbQuery("UPDATE exercises SET weight = ? WHERE id = ?", [weight, id]);
  updateSyncStatus(false);
}

async function addExercise() {
  const nameInput = document.getElementById('new-ex-name');
  const setsInput = document.getElementById('new-ex-sets');
  const name = nameInput.value.trim();
  const sets = setsInput.value.trim();

  if (!name) return;

  updateSyncStatus(true);
  await dbQuery("INSERT INTO exercises (week_id, day_index, name, sets) VALUES (?, ?, ?, ?)", [currentWeekId, currentDay, name, sets]);
  await loadExercises();
  renderRoutine();

  // Cerrar modal y limpiar
  document.getElementById('add-exercise-modal').style.display = 'none';
  nameInput.value = '';
  setsInput.value = '';
  updateSyncStatus(false);
}

async function deleteExercise(id) {
  if (!confirm("¿Borrar este ejercicio?")) return;
  updateSyncStatus(true);
  await dbQuery("DELETE FROM exercises WHERE id = ?", [id]);
  await loadExercises();
  renderRoutine();
  updateSyncStatus(false);
}

function renderRoutine() {
  const container = document.getElementById('routine-content');
  const colors = ["var(--accent-1)", "var(--accent-2)", "var(--accent-3)", "var(--accent-4)"];
  const color = colorForDay(currentDay);

  const html = `
    <div class="day-header">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span class="day-tag" style="background: ${color}20; color: ${color}">DÍA ${currentDay}</span>
          <h2>Día ${currentDay}</h2>
        </div>
        <button class="secondary-btn" onclick="document.getElementById('add-exercise-modal').style.display = 'flex'">+ Add Ex</button>
      </div>
    </div>
    
    <div class="exercise-list">
      ${currentExercises.map(ex => `
        <div class="exercise-card ${ex.completed ? 'completed' : ''}" style="border-left: 4px solid ${ex.completed ? 'transparent' : color}">
          <div class="exercise-main" onclick="window.toggleExercise(${ex.id}, ${ex.completed})">
            <div class="exercise-info">
              <span class="exercise-name">${ex.name}</span>
              <span class="exercise-sets">${ex.sets}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <button class="delete-ex-btn" onclick="event.stopPropagation(); window.deleteExercise(${ex.id})">×</button>
              <div class="checkbox-wrapper">
                <span class="checkmark" style="color: ${color}"></span>
              </div>
            </div>
          </div>
          <div class="exercise-extra">
             <input type="text" placeholder="Peso (kg)" value="${ex.weight}" onchange="window.updateWeight(${ex.id}, this.value)" onclick="event.stopPropagation()">
          </div>
        </div>
      `).join('')}
    </div>
  `;
  container.innerHTML = html;
}

function colorForDay(day) {
  const colors = ["var(--accent-1)", "var(--accent-2)", "var(--accent-3)", "var(--accent-4)"];
  return colors[day - 1] || "var(--lu-pink)";
}

function updateSyncStatus(syncing) {
  const footerStatus = document.getElementById('sync-status');
  if (footerStatus) footerStatus.innerHTML = syncing ? "🔄 Sincronizando..." : "✨ LuFit Cloud Active";
}

// Event Listeners
document.getElementById('week-select').addEventListener('change', async (e) => {
  currentWeekId = parseInt(e.target.value);
  updateSyncStatus(true);
  await loadExercises();
  renderRoutine();
  updateSyncStatus(false);
});

document.getElementById('add-week-btn').addEventListener('click', async () => {
  const name = prompt("Nombre de la nueva semana (ej: Semana 2)");
  if (name) {
    updateSyncStatus(true);
    await createWeek(name);
    updateSyncStatus(false);
  }
});

document.getElementById('save-ex-btn').addEventListener('click', addExercise);

document.querySelectorAll('.day-tab').forEach(tab => {
  tab.addEventListener('click', async () => {
    document.querySelectorAll('.day-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentDay = parseInt(tab.dataset.day);
    updateSyncStatus(true);
    await loadExercises();
    renderRoutine();
    updateSyncStatus(false);
  });
});

window.toggleExercise = toggleExercise;
window.updateWeight = updateWeight;
window.deleteExercise = deleteExercise;

// Init
initApp();
