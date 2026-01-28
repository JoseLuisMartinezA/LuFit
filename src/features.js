import { dbQuery, dbBatch } from './db.js';
import { state, setCurrentUser } from './state.js';
import { initTimer, startRestTimer } from './timer.js';
import { showAIPlannerModal } from './ai_planner.js';

// ============================================
// CONFIG & CONSTANTS
// ============================================

// ============================================
// CONFIG & CONSTANTS
// ============================================

// V2 SCHEMA DEFINITION (For Auto-Init)
const V2_SETUP_SQL = [
  "DROP TABLE IF EXISTS exercises",
  "DROP TABLE IF EXISTS day_titles",
  "DROP TABLE IF EXISTS weeks",
  "DROP TABLE IF EXISTS routines",
  "DROP TABLE IF EXISTS user_profile",
  "DROP TABLE IF EXISTS daily_steps",
  "DROP TABLE IF EXISTS users",
  "DROP TABLE IF EXISTS exercise_library",

  "CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, email TEXT, is_verified INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)",
  "CREATE TABLE user_profile (user_id INTEGER PRIMARY KEY, weight REAL, height REAL, age INTEGER, gender TEXT, daily_steps_goal INTEGER DEFAULT 10000, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id))",
  "CREATE TABLE exercise_library (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, target_muscle TEXT, equipment TEXT, difficulty_level TEXT, video_url TEXT)",
  "CREATE TABLE routines (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, name TEXT NOT NULL, is_active INTEGER DEFAULT 0, num_days INTEGER DEFAULT 4, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id))",
  "CREATE TABLE weeks (id INTEGER PRIMARY KEY AUTOINCREMENT, routine_id INTEGER NOT NULL, user_id INTEGER NOT NULL, name TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(routine_id) REFERENCES routines(id))",
  "CREATE TABLE day_titles (week_id INTEGER, day_index INTEGER, title TEXT, day_order INTEGER DEFAULT 0, PRIMARY KEY(week_id, day_index), FOREIGN KEY(week_id) REFERENCES weeks(id))",
  "CREATE TABLE exercises (id INTEGER PRIMARY KEY AUTOINCREMENT, week_id INTEGER NOT NULL, day_index INTEGER NOT NULL, exercise_library_id INTEGER, custom_name TEXT, series_target TEXT, weight REAL, completed INTEGER DEFAULT 0, sensation TEXT, order_index INTEGER DEFAULT 0, FOREIGN KEY(week_id) REFERENCES weeks(id), FOREIGN KEY(exercise_library_id) REFERENCES exercise_library(id))",
  "CREATE TABLE daily_steps (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, date TEXT, steps INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
];

// TOP 80+ ESSENTIAL EXERCISES (Seed)
const SEED_LIBRARY_SQL = `
INSERT INTO exercise_library (name, target_muscle, equipment, difficulty_level) VALUES
('Press de Banca (Barra)', 'Pecho', 'Barra', 'Intermedio'),
('Press de Banca (Mancuernas)', 'Pecho', 'Mancuernas', 'Intermedio'),
('Press Inclinado (Barra)', 'Pecho', 'Barra', 'Intermedio'),
('Press Inclinado (Mancuernas)', 'Pecho', 'Mancuernas', 'Intermedio'),
('Aperturas (Mancuernas)', 'Pecho', 'Mancuernas', 'Principiante'),
('Cruce de Poleas', 'Pecho', 'Polea', 'Intermedio'),
('Fondos (Dips)', 'Pecho', 'Corporal', 'Intermedio'),
('Flexiones', 'Pecho', 'Corporal', 'Principiante'),
('Pullover', 'Pecho', 'Mancuernas', 'Intermedio'),

('Dominadas', 'Espalda', 'Corporal', 'Avanzado'),
('Jalón al Pecho', 'Espalda', 'Polea', 'Principiante'),
('Remo con Barra', 'Espalda', 'Barra', 'Intermedio'),
('Remo con Mancuerna', 'Espalda', 'Mancuernas', 'Intermedio'),
('Remo en Polea Baja', 'Espalda', 'Polea', 'Intermedio'),
('Peso Muerto', 'Espalda', 'Barra', 'Avanzado'),
('Hiperextensiones', 'Espalda', 'Banco', 'Principiante'),
('Face Pull', 'Hombros', 'Polea', 'Principiante'),

('Sentadilla (Barra)', 'Pierna', 'Barra', 'Avanzado'),
('Sentadilla Frontal', 'Pierna', 'Barra', 'Avanzado'),
('Prensa de Piernas', 'Pierna', 'Máquina', 'Principiante'),
('Sentadilla Hack', 'Pierna', 'Máquina', 'Intermedio'),
('Extensiones de Cuádriceps', 'Pierna', 'Máquina', 'Principiante'),
('Zancadas', 'Pierna', 'Mancuernas', 'Intermedio'),
('Sentadilla Búlgara', 'Pierna', 'Mancuernas', 'Avanzado'),
('Peso Muerto Rumano', 'Pierna', 'Barra', 'Intermedio'),
('Curl Femoral Tumbado', 'Pierna', 'Máquina', 'Principiante'),
('Curl Femoral Sentado', 'Pierna', 'Máquina', 'Principiante'),
('Hip Thrust', 'Glúteos', 'Barra', 'Intermedio'),
('Patada de Glúteo', 'Glúteos', 'Polea', 'Intermedio'),
('Gemelos de Pie', 'Pierna', 'Máquina', 'Principiante'),
('Gemelos Sentado', 'Pierna', 'Máquina', 'Principiante'),

('Press Militar', 'Hombros', 'Barra', 'Intermedio'),
('Press Arnold', 'Hombros', 'Mancuernas', 'Intermedio'),
('Elevaciones Laterales', 'Hombros', 'Mancuernas', 'Principiante'),
('Elevaciones Frontales', 'Hombros', 'Mancuernas', 'Principiante'),
('Pájaros', 'Hombros', 'Mancuernas', 'Intermedio'),
('Remo al Mentón', 'Hombros', 'Barra', 'Intermedio'),

('Curl de Bíceps (Barra)', 'Bíceps', 'Barra', 'Principiante'),
('Curl de Bíceps (Mancuernas)', 'Bíceps', 'Mancuernas', 'Principiante'),
('Curl Martillo', 'Bíceps', 'Mancuernas', 'Principiante'),
('Curl Predicador', 'Bíceps', 'Barra Z', 'Intermedio'),
('Curl en Polea', 'Bíceps', 'Polea', 'Principiante'),

('Press Francés', 'Tríceps', 'Barra Z', 'Intermedio'),
('Extensiones de Tríceps', 'Tríceps', 'Polea', 'Principiante'),
('Fondos entre Bancos', 'Tríceps', 'Corporal', 'Principiante'),
('Patada de Tríceps', 'Tríceps', 'Mancuernas', 'Intermedio'),

('Plancha', 'Core', 'Corporal', 'Principiante'),
('Crunch Abdominal', 'Core', 'Corporal', 'Principiante'),
('Elevación de Piernas', 'Core', 'Corporal', 'Intermedio'),
('Rueda Abdominal', 'Core', 'Accesorio', 'Avanzado'),
('Russian Twist', 'Core', 'Mancuernas', 'Intermedio'),
('Burpees', 'Cardio', 'Corporal', 'Intermedio'),
('Kettlebell Swing', 'Full Body', 'Kettlebell', 'Intermedio'),
('Box Jumps', 'Pierna', 'Cajón', 'Intermedio'),
('Salto a la Comba', 'Cardio', 'Cuerda', 'Principiante'),
('Correr (Cinta)', 'Cardio', 'Máquina', 'Principiante'),
('Elíptica', 'Cardio', 'Máquina', 'Principiante');
`;

let editingExerciseId = null;


// ============================================
// INITIALIZATION
// ============================================

export async function initApp() {
  updateSyncStatus(true);
  try {
    // === V2 MIGRATION CHECK ===
    const checkLib = await dbQuery("SELECT count(*) FROM sqlite_master WHERE type='table' AND name='exercise_library'");

    // Only init if we get a VALID response saying count is 0. 
    let countVal = -1;
    if (checkLib && checkLib.results && checkLib.results[0] && checkLib.results[0].type === 'ok') {
      countVal = parseInt(checkLib.results[0].response.result.rows[0][0].value);
    }

    console.log("DB Check: exercise_library count =", countVal);

    if (countVal === 0) {
      console.log("Initializing LuFit V2 Database (Hard Reset)...");
      const ops = V2_SETUP_SQL.map(sql => ({ sql: sql }));
      await dbBatch(ops);
      // Seed
      await dbQuery(SEED_LIBRARY_SQL);

      // Clear LocalStorage Auth because users table is gone
      state.currentUser = null;
      localStorage.removeItem('lufit_user');
      console.log("Database V2 Ready.");

      // Force reload to show login screen cleanly
      location.reload();
      return;
    }

    if (!state.currentUser) {
      showLogin();
      return;
    }

    // Load Data
    const profileRes = await dbQuery("SELECT * FROM user_profile WHERE user_id = ?", [state.currentUser.id]);

    // Strict check: Only show setup if query SUCCEEDED but returned NO rows.
    if (profileRes && profileRes.results[0].type === 'ok') {
      if (profileRes.results[0].response.result.rows.length === 0) {
        showProfileSetup();
        return;
      }
    } else if (!profileRes) {
      // Network error or DB unavail.
      // Do NOT show profile setup, just stop or retry?
      console.error("Connection failed.");
      // Maybe show a retry button in UI? For now, let's not block but we can't render dashboard without profile safely.
      // We'll let it fall through but renderDashboard checks state.userProfile again.
      // Actually, renderDashboard calls loadUserProfile which does a query.
    }

    hideLogin();
    await loadRoutines();
    await loadUserProfile();
    initTimer();
    showView('dashboard');

  } catch (err) {
    console.error("Init failed", err);
  } finally {
    updateSyncStatus(false);
  }
}

// ============================================
// AUTH
// ============================================

export function showLogin() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('register-view').style.display = 'none';
  document.getElementById('login-view').style.display = 'block';
  document.getElementById('app-content').style.display = 'none';
}

export function showRegister() {
  document.getElementById('login-view').style.display = 'none';
  document.getElementById('register-view').style.display = 'block';
}

export function showLoginView() {
  document.getElementById('login-view').style.display = 'block';
  document.getElementById('register-view').style.display = 'none';
}

export function hideLogin() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-content').style.display = 'flex';
  if (state.currentUser) {
    const nameEl = document.getElementById('user-display-name');
    if (nameEl) nameEl.innerText = state.currentUser.username;
  }
}

export async function login() {
  const userIn = document.getElementById('login-username').value.trim().toLowerCase();
  const passIn = document.getElementById('login-password').value.trim();
  const errorMsg = document.getElementById('login-error');

  if (!userIn || !passIn) return;

  updateSyncStatus(true);
  const res = await dbQuery("SELECT id, username FROM users WHERE username = ? AND password = ?", [userIn, passIn]);

  if (res && res.results[0].type === 'ok' && res.results[0].response.result.rows.length > 0) {
    const row = res.results[0].response.result.rows[0];
    setCurrentUser({ id: parseInt(row[0].value), username: row[1].value });
    errorMsg.innerText = "";
    initApp();
  } else {
    errorMsg.innerText = "Usuario o contraseña incorrectos";
  }
  updateSyncStatus(false);
}

export async function register() {
  const userIn = document.getElementById('reg-username').value.trim().toLowerCase();
  const passIn = document.getElementById('reg-password').value.trim();
  const errorMsg = document.getElementById('reg-error');

  if (!userIn || !passIn) return;

  updateSyncStatus(true);
  const checkUser = await dbQuery("SELECT id FROM users WHERE username = ?", [userIn]);
  if (checkUser && checkUser.results[0].response.result.rows.length > 0) {
    errorMsg.innerText = "Ese usuario ya existe";
    updateSyncStatus(false);
    return;
  }

  const res = await dbQuery("INSERT INTO users (username, password, is_verified) VALUES (?, ?, 1)", [userIn, passIn]);
  if (res && res.results[0].type === 'ok') {
    const loginRes = await dbQuery("SELECT id, username FROM users WHERE username = ? AND password = ?", [userIn, passIn]);
    const row = loginRes.results[0].response.result.rows[0];
    setCurrentUser({ id: parseInt(row[0].value), username: row[1].value });
    hideLogin();
    initApp();
  } else {
    errorMsg.innerText = "Error al registrar";
  }
  updateSyncStatus(false);
}

export function logout() {
  setCurrentUser(null);
  location.reload();
}

export function toggleAccountMenu(event) {
  event.stopPropagation();
  const dropdown = document.getElementById('account-dropdown');
  dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
}

// ============================================
// PROFILE & DASHBOARD
// ============================================

export function showProfileSetup() {
  // Use existing modal structure for consistent styling
  const isEditing = !!state.userProfile;
  const modalId = 'profile-setup-modal';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const html = `
    <div class="modal" id="${modalId}" style="display: flex;">
      <div class="modal-content">
        <div class="modal-header">
           <div style="display:flex; align-items:center; gap:12px;">
             <img src="favicon.png" alt="LuFit" style="height:32px;">
             <h3 style="margin:0;">${isEditing ? 'Editar Perfil' : 'Bienvenido a LuFit'}</h3>
           </div>
           ${isEditing ? `<button class="close-modal" onclick="document.getElementById('${modalId}').remove()">×</button>` : ''}
        </div>
        <div class="modal-body">
          <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 20px;">
            ${isEditing ? 'Actualiza tus datos corporales para recalcular tus estadísticas.' : 'Completa tu perfil para personalizar tu experiencia.'}
          </p>
          <div class="profile-setup-form" style="display: flex; flex-direction: column; gap: 16px;">
            <div class="input-group"><label>Peso (kg)</label><input type="number" id="profile-weight" value="${state.userProfile?.weight || ''}" placeholder="Ej: 70" step="0.1"></div>
            <div class="input-group"><label>Altura (cm)</label><input type="number" id="profile-height" value="${state.userProfile?.height || ''}" placeholder="Ej: 170"></div>
            <div class="input-group"><label>Edad</label><input type="number" id="profile-age" value="${state.userProfile?.age || ''}" placeholder="Ej: 25"></div>
            <div class="input-group"><label>Género</label>
              <select id="profile-gender" style="background: rgba(255, 255, 255, 0.04); border: 1px solid var(--panel-border); padding: 14px; border-radius: 12px; color: white; outline: none; font-size: 16px;">
                <option value="">Selecciona...</option>
                <option value="male" ${state.userProfile?.gender === 'male' ? 'selected' : ''}>Masculino</option>
                <option value="female" ${state.userProfile?.gender === 'female' ? 'selected' : ''}>Femenino</option>
                <option value="other" ${state.userProfile?.gender === 'other' ? 'selected' : ''}>Otro</option>
              </select>
            </div>
            <div class="input-group"><label>Meta de pasos diarios</label><input type="number" id="profile-steps-goal" value="${state.userProfile?.stepsGoal || '10000'}" step="1000"></div>
            <p id="profile-error" class="login-error" style="margin:0; min-height:0;"></p>
            <button onclick="window.saveProfile()" class="primary-btn">${isEditing ? 'Guardar Cambios' : 'Guardar y Continuar'}</button>
          </div>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

export async function saveProfile() {
  const weight = parseFloat(document.getElementById('profile-weight').value);
  const height = parseInt(document.getElementById('profile-height').value);
  const age = parseInt(document.getElementById('profile-age').value);
  const gender = document.getElementById('profile-gender').value;
  const stepsGoal = parseInt(document.getElementById('profile-steps-goal').value);

  if (!weight || !height || !age || !gender) {
    document.getElementById('profile-error').innerText = "Completa todos los campos";
    return;
  }

  updateSyncStatus(true);
  const now = new Date().toISOString();

  // Check if update or insert
  const existing = await dbQuery("SELECT user_id FROM user_profile WHERE user_id = ?", [state.currentUser.id]);
  if (existing && existing.results[0].response.result.rows.length > 0) {
    await dbQuery("UPDATE user_profile SET weight = ?, height = ?, age = ?, gender = ?, daily_steps_goal = ? WHERE user_id = ?",
      [weight, height, age, gender, stepsGoal, state.currentUser.id]);
  } else {
    await dbQuery("INSERT INTO user_profile (user_id, weight, height, age, gender, daily_steps_goal, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [state.currentUser.id, weight, height, age, gender, stepsGoal, now]);
  }

  const modal = document.getElementById('profile-setup-modal');
  if (modal) modal.remove();

  await loadUserProfile();
  hideLogin();
  await loadRoutines();
  showView(state.currentView || 'dashboard');
  updateSyncStatus(false);
}

export async function loadUserProfile() {
  const res = await dbQuery("SELECT * FROM user_profile WHERE user_id = ?", [state.currentUser.id]);
  if (res && res.results[0].type === 'ok' && res.results[0].response.result.rows.length > 0) {
    const row = res.results[0].response.result.rows[0];
    state.userProfile = {
      weight: parseFloat(row[1].value),
      height: parseInt(row[2].value),
      age: parseInt(row[3].value),
      gender: row[4].value,
      stepsGoal: parseInt(row[5].value),
      bmi: (parseFloat(row[1].value) / Math.pow(parseInt(row[2].value) / 100, 2)).toFixed(1)
    };
  }
}

export async function renderDashboard() {
  if (!state.userProfile) await loadUserProfile();
  const todaySteps = await getTodaySteps();
  const history = await getStepsHistory();
  const stepProgress = Math.min((todaySteps / state.userProfile.stepsGoal) * 100, 100);

  const container = document.getElementById('dashboard-content');
  if (!container) return;

  container.innerHTML = `
    <div class="dashboard-header-new">
      <div class="brand-area">
          <img src="favicon.png" alt="LuFit" class="brand-logo">
          <div class="brand-text">
            <h1>LuFit</h1>
            <span>Smart Fitness</span>
          </div>
      </div>
      <div class="user-welcome">
         Hola, <strong>${state.currentUser.username}</strong>
      </div>
    </div>

    <div class="dashboard-main-card">
       <button class="calendar-btn-trigger" onclick="window.openCalendarModal()">📅</button>
       <div class="steps-circle-container">
          <svg class="steps-progress-ring" width="140" height="140">
             <circle stroke="rgba(255,255,255,0.05)" stroke-width="10" fill="transparent" r="60" cx="70" cy="70"/>
             <circle stroke="var(--lu-orange)" stroke-width="10" fill="transparent" r="60" cx="70" cy="70"
                     style="stroke-dasharray: ${2 * Math.PI * 60}; stroke-dashoffset: ${2 * Math.PI * 60 * (1 - stepProgress / 100)}"/>
          </svg>
          <div class="steps-text-center">
             <span class="steps-big-number">${todaySteps.toLocaleString()}</span>
             <span class="steps-label">Pasos Hoy</span>
          </div>
       </div>
       <div class="steps-target">Meta: ${state.userProfile.stepsGoal.toLocaleString()}</div>
    </div>
    
    <div class="stats-grid-new">
       <div class="stat-card-new">
          <div class="stat-icon-new">⚖️</div>
          <div class="stat-info-new">
             <span class="stat-label-new">Peso</span>
             <span class="stat-value-new">${state.userProfile.weight} <span>kg</span></span>
          </div>
       </div>
       <div class="stat-card-new">
          <div class="stat-icon-new">📏</div>
          <div class="stat-info-new">
             <span class="stat-label-new">Altura</span>
             <span class="stat-value-new">${state.userProfile.height} <span>cm</span></span>
          </div>
       </div>
       <div class="stat-card-new">
          <div class="stat-icon-new">📊</div>
          <div class="stat-info-new">
             <span class="stat-label-new">IMC</span>
             <span class="stat-value-new">${state.userProfile.bmi}</span>
          </div>
       </div>
    </div>

     <div class="dashboard-promo">
       <div class="dashboard-promo-content">
          <div class="dashboard-promo-text">
            <h3>Crear Rutina Profesional</h3>
            <p>Deja que <strong>Lu</strong> analice tus datos y diseñe el plan perfecto para ti.</p>
          </div>
          <div class="dashboard-promo-icon">🤖</div>
       </div>
       <button onclick="window.showAIPlannerModal()" class="dashboard-promo-btn">
          ¡Vamos allá! 🚀
       </button>
     </div>


    <div class="dashboard-section">
      <div class="section-header">
        <h3>👟 Registro de Pasos</h3>
      </div>
      <div class="steps-input-wrapper">
         <input type="number" id="manual-steps-input" placeholder="Añadir pasos..." value="${todaySteps > 0 ? todaySteps : ''}">
         <button onclick="window.updateTodaySteps()" class="icon-btn-update">💾</button>
      </div>

      ${history.length > 0 ? `
      <div class="history-list">
        <h4 class="history-title">Días anteriores</h4>
        ${history.map(item => `
          <div class="history-item">
            <span class="history-date">${formatDateLabel(item.date)}</span>
            <div class="history-bar-container">
               <div class="history-bar" style="width: ${Math.min((item.steps / state.userProfile.stepsGoal) * 100, 100)}%"></div>
            </div>
            <span class="history-steps">${item.steps.toLocaleString()}</span>
          </div>
        `).join('')}
      </div>
      ` : ''}
    </div>

    <div class="dashboard-section tips-dashboard">
       <div class="section-header">
         <h3>📌 Tips rápidos</h3>
       </div>
       <ul class="tips-list dashboard-tips">
          <li>
            <span class="tip-icon">⚖️</span>
            <p>Usa <strong>peso medio</strong> (las últimas reps deben costar)</p>
          </li>
          <li>
            <span class="tip-icon">✨</span>
            <p>Prioriza <strong>buena técnica</strong> por encima del peso</p>
          </li>
          <li>
            <span class="tip-icon">📈</span>
            <p>Intenta <strong>mejorar cada semana</strong> (peso o reps)</p>
          </li>
       </ul>
    </div>
  `;
}

export function renderProfile() {
  const container = document.getElementById('profile-content');
  if (!container) return;
  if (!state.userProfile) {
    container.innerHTML = "<p style='text-align:center; padding:20px;'>Cargando perfil...</p>";
    return;
  }

  container.innerHTML = `
    <h2 class="view-title">Mi Perfil</h2>
    
    <div class="summary-card" style="flex-direction:row; align-items:center; text-align:left; margin-bottom:20px; padding:20px;">
      <div class="account-avatar" style="width:60px; height:60px; font-size:1.5rem;">
        ${state.currentUser.username.charAt(0).toUpperCase()}
      </div>
      <div style="margin-left:16px;">
        <h3 style="margin:0;">${state.currentUser.username}</h3>
        <p style="margin:0; opacity:0.7; font-size:0.9rem;">Usuario LuFit</p>
      </div>
    </div>

    <div class="dashboard-section">
      <h3>Datos Corporales</h3>
      <div class="stats-grid" style="grid-template-columns: 1fr 1fr;">
        <div class="stat-card">
          <div class="stat-label">Peso</div>
          <div class="stat-value" style="font-size:1.5rem;">${state.userProfile.weight} kg</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Altura</div>
          <div class="stat-value" style="font-size:1.5rem;">${state.userProfile.height} cm</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">IMC</div>
          <div class="stat-value" style="font-size:1.5rem;">${state.userProfile.bmi}</div>
          <div class="stat-sublabel" style="font-size:0.8rem; margin-top:4px;">${getBMICategory(state.userProfile.bmi)}</div>
        </div>
        <div class="stat-card">
           <div class="stat-label">Meta Pasos</div>
           <div class="stat-value" style="font-size:1.5rem;">${state.userProfile.stepsGoal}</div>
        </div>
      </div>
      <button onclick="window.showProfileSetup()" class="secondary-btn" style="width:100%; margin-top:16px;">✏️ Editar Datos</button>
    </div>

    <div class="dashboard-section" style="margin-top:20px;">
      <button onclick="window.logout()" class="danger-btn" style="width:100%; justify-content:center;">
        Cerrar Sesión
      </button>
    </div>
  `;
}

function getBMICategory(bmi) {
  const b = parseFloat(bmi);
  if (b < 18.5) return "Bajo peso";
  if (b < 25) return "Normal";
  if (b < 30) return "Sobrepeso";
  return "Obesidad";
}

export async function getStepsHistory() {
  const res = await dbQuery("SELECT date, steps FROM daily_steps WHERE user_id = ? AND date != ? ORDER BY date DESC LIMIT 7", [state.currentUser.id, new Date().toISOString().split('T')[0]]);
  if (res && res.results[0].type === 'ok') {
    return res.results[0].response.result.rows.map(r => ({ date: r[0].value, steps: parseInt(r[1].value) }));
  }
  return [];
}

function formatDateLabel(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  if (diff === 1) return "Ayer";
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
}

export async function getTodaySteps() {
  const today = new Date().toISOString().split('T')[0];
  const res = await dbQuery("SELECT steps FROM daily_steps WHERE user_id = ? AND date = ?", [state.currentUser.id, today]);
  if (res && res.results[0].type === 'ok' && res.results[0].response.result.rows.length > 0) {
    return parseInt(res.results[0].response.result.rows[0][0].value);
  }
  return 0;
}

export async function openCalendarModal() {
  const modalId = 'calendar-modal';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const now = new Date();
  const currentYear = now.getFullYear();
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const html = `
    <div class="modal" id="${modalId}" style="display: flex;">
      <div class="modal-content" style="max-width: 400px; padding: 24px;">
        <div class="modal-header" style="border:none; padding-bottom:10px; justify-content:space-between;">
           <h3 style="margin:0; font-size: 1.2rem;">${monthNames[now.getMonth()]} ${currentYear}</h3>
           <button class="close-modal" onclick="document.getElementById('${modalId}').remove()">×</button>
        </div>
        <div class="modal-body" style="padding:0;">
           <div style="display:grid; grid-template-columns: repeat(7, 1fr); gap:8px; margin-bottom:8px; text-align:center;">
              ${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => `<span style="font-size:0.8rem; color:var(--text-secondary);">${d}</span>`).join('')}
           </div>
           <div id="calendar-grid" class="calendar-grid">
              <!-- Days go here -->
           </div>
           
           <div id="calendar-day-detail" class="calendar-day-detail" style="display:none;"></div>
        </div>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);
  await renderCalendar(now.getFullYear(), now.getMonth());
}

async function renderCalendar(year, month) {
  const grid = document.getElementById('calendar-grid');
  if (!grid) return;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let firstDay = new Date(year, month, 1).getDay(); // 0Sun - 6Sat
  // Adjust for Monday start (Spain)
  // Sun(0)->6, Mon(1)->0, Tue(2)->1
  firstDay = (firstDay === 0) ? 6 : firstDay - 1;

  const strMonth = (month + 1).toString().padStart(2, '0');

  // Use LIKE for simple prefix match on ISO date
  const res = await dbQuery("SELECT date, steps FROM daily_steps WHERE user_id = ? AND date LIKE ?", [state.currentUser.id, `${year}-${strMonth}-%`]);

  const stepsMap = {};
  if (res && res.results[0].type === 'ok') {
    res.results[0].response.result.rows.forEach(r => {
      stepsMap[r[0].value] = parseInt(r[1].value);
    });
  }

  let html = '';
  // Empty slots
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="calendar-cell empty"></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${strMonth}-${day.toString().padStart(2, '0')}`;
    const steps = stepsMap[dateStr] || 0;
    const hasSteps = steps > 0;
    const opacity = hasSteps ? Math.min(1, Math.max(0.3, steps / state.userProfile.stepsGoal)) : 0;

    html += `
       <div class="calendar-cell" onclick="window.showCalendarDayDetail('${dateStr}', ${steps})">
          <span class="day-number">${day}</span>
          ${hasSteps ? `<div class="step-dot" style="opacity: ${opacity}"></div>` : ''}
       </div>
     `;
  }
  grid.innerHTML = html;
}

export function showCalendarDayDetail(dateStr, steps) {
  const detailEl = document.getElementById('calendar-day-detail');
  if (!detailEl) return;

  const d = new Date(dateStr);
  const dateDisplay = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  detailEl.style.display = 'flex';
  detailEl.innerHTML = `
      <div class="detail-circle">
         <span class="detail-steps">${steps.toLocaleString()}</span>
         <span class="detail-label">Pasos</span>
      </div>
      <div class="detail-date">${dateDisplay}</div>
   `;
}

export async function updateTodaySteps() {
  const steps = parseInt(document.getElementById('manual-steps-input').value) || 0;
  const today = new Date().toISOString().split('T')[0];
  const existing = await dbQuery("SELECT id FROM daily_steps WHERE user_id = ? AND date = ?", [state.currentUser.id, today]);

  updateSyncStatus(true);
  if (existing && existing.results[0].response.result.rows.length > 0) {
    await dbQuery("UPDATE daily_steps SET steps = ? WHERE user_id = ? AND date = ?", [steps, state.currentUser.id, today]);
  } else {
    await dbQuery("INSERT INTO daily_steps (user_id, date, steps, created_at) VALUES (?, ?, ?, ?)", [state.currentUser.id, today, steps, new Date().toISOString()]);
  }
  updateSyncStatus(false);
  renderDashboard();
}

// ============================================
// ROUTINES & WEEKS MANAGEMENT
// ============================================

// ============================================
// ROUTINES (SINGLE MODE RESTORED)
// ============================================

export async function loadRoutines() {
  // 1. Get All Routines (Limit 3)
  const res = await dbQuery("SELECT id, name FROM routines WHERE user_id = ? ORDER BY id ASC LIMIT 3", [state.currentUser.id]);

  state.routines = [];
  if (res && res.results[0].type === 'ok' && res.results[0].response.result.rows.length > 0) {
    state.routines = res.results[0].response.result.rows.map(r => ({
      id: parseInt(r[0].value),
      name: r[1].value
    }));
  } else {
    const now = new Date().toISOString();
    const createRes = await dbQuery("INSERT INTO routines (user_id, name, is_active, num_days, created_at) VALUES (?, ?, ?, ?, ?)",
      [state.currentUser.id, "Rutina Inicial", 1, 4, now]);
    const newId = parseInt(createRes.results[0].response.result.last_insert_rowid);
    state.routines = [{ id: newId, name: "Rutina Inicial" }];
  }

  // Set default active if none
  if (!state.currentRoutineId || !state.routines.find(r => r.id === state.currentRoutineId)) {
    state.currentRoutineId = state.routines[0].id;
  }

  // 2. MIGRATION: Link orphan weeks to the FIRST routine
  await dbQuery("UPDATE weeks SET routine_id = ? WHERE user_id = ? AND (routine_id IS NULL OR routine_id = '')",
    [state.routines[0].id, state.currentUser.id]);

  // 3. Load weeks for current routine
  await loadWeeks();

  if (state.currentView === 'routines' || state.currentView === 'routine-detail') {
    renderRoutineDetail();
  }
}

export async function createRoutine(name = "Nueva Rutina") {
  if (state.routines.length >= 3) {
    showAlert("Has alcanzado el límite de 3 rutinas.");
    return;
  }

  const now = new Date().toISOString();
  // Name auto-increment if not provided or default?
  // If we want specific names:
  const newName = name || `Rutina ${state.routines.length + 1}`;

  const res = await dbQuery("INSERT INTO routines (user_id, name, is_active, num_days, created_at) VALUES (?, ?, ?, ?, ?)",
    [state.currentUser.id, newName, 1, 4, now]);

  if (res && res.results[0].type === 'ok') {
    const newId = parseInt(res.results[0].response.result.last_insert_rowid);
    // Create default week for it?
    await createWeek("Semana 1", newId, true);

    await loadRoutines();
    setActiveRoutine(newId);
  }
}

export async function setActiveRoutine(id) {
  state.currentRoutineId = id;
  await loadWeeks();
  renderRoutineDetail();
}

export async function deleteRoutine(id) {
  if (state.routines.length <= 1) {
    showAlert("Debes tener al menos una rutina.");
    return;
  }
  if (!await showConfirm("¿Eliminar esta rutina y todos sus datos?", "Eliminar Rutina", { isDanger: true, confirmText: "Eliminar" })) return;

  updateSyncStatus(true);
  // Delete hierarchy: Exercises -> DayTitles -> Weeks -> Routine
  // Getting weeks first
  const weeksRes = await dbQuery("SELECT id FROM weeks WHERE routine_id = ?", [id]);
  if (weeksRes && weeksRes.results[0].type === 'ok') {
    const weekIds = weeksRes.results[0].response.result.rows.map(r => r[0].value);
    for (const wId of weekIds) {
      await dbQuery("DELETE FROM exercises WHERE week_id = ?", [wId]);
      await dbQuery("DELETE FROM day_titles WHERE week_id = ?", [wId]);
    }
  }
  await dbQuery("DELETE FROM weeks WHERE routine_id = ?", [id]);
  await dbQuery("DELETE FROM routines WHERE id = ?", [id]);

  state.currentRoutineId = null; // Forces loadRoutines to pick default
  await loadRoutines();
  updateSyncStatus(false);
}

export async function duplicateRoutine(id) {
  if (state.routines.length >= 3) {
    showAlert("Límite de rutinas alcanzado (3/3).");
    return;
  }

  const original = state.routines.find(r => r.id === id);
  if (!original) return;

  const newName = original.name + " (Copia)";

  // 1. Create Routine
  const now = new Date().toISOString();
  const res = await dbQuery("INSERT INTO routines (user_id, name, is_active, num_days, created_at) VALUES (?, ?, ?, ?, ?)",
    [state.currentUser.id, newName, 1, 4, now]);
  const newRoutineId = parseInt(res.results[0].response.result.last_insert_rowid);

  // 2. Fetch Weeks
  const weeksRes = await dbQuery("SELECT id, name FROM weeks WHERE routine_id = ?", [id]);
  if (weeksRes && weeksRes.results[0].type === 'ok') {
    const weeks = weeksRes.results[0].response.result.rows;
    for (const w of weeks) {
      const oldWId = parseInt(w[0].value);
      const wName = w[1].value;

      // Create Week
      const wRes = await dbQuery("INSERT INTO weeks (routine_id, user_id, name) VALUES (?, ?, ?)",
        [newRoutineId, state.currentUser.id, wName]);
      const newWId = parseInt(wRes.results[0].response.result.last_insert_rowid);

      // Copy Day Titles
      await dbQuery("INSERT INTO day_titles (week_id, day_index, title, day_order) SELECT ?, day_index, title, day_order FROM day_titles WHERE week_id = ?",
        [newWId, oldWId]);

      // Copy Exercises V2
      await dbQuery("INSERT INTO exercises (week_id, day_index, exercise_library_id, custom_name, series_target, weight, order_index, completed) SELECT ?, day_index, exercise_library_id, custom_name, series_target, weight, order_index, 0 FROM exercises WHERE week_id = ?",
        [newWId, oldWId]);
    }
  }

  await loadRoutines();
  setActiveRoutine(newRoutineId);
}

export async function loadWeeks() {
  if (!state.currentRoutineId) return;
  const res = await dbQuery("SELECT id, name FROM weeks WHERE routine_id = ? ORDER BY id ASC", [state.currentRoutineId]);

  state.weeks = [];
  if (res && res.results[0].type === 'ok') {
    state.weeks = res.results[0].response.result.rows.map(r => ({ id: parseInt(r[0].value), name: r[1].value }));
  }

  // If no weeks, verify if we need to migrate VERY old data (from before 'weeks' table exist? No, assuming standard structure)
  // If purely empty, create Week 1
  if (state.weeks.length === 0) {
    await createWeek("Semana 1", state.currentRoutineId, true);
  } else {
    // Select last week by default
    state.currentWeekId = state.weeks[state.weeks.length - 1].id;
    await loadDayTitles();
    await loadExercises();
  }
}

// INTELLIGENT COPY WEEK
export async function createWeek(name, routineId = null, useDefault = false) {
  const rId = routineId || state.currentRoutineId;
  const res = await dbQuery("INSERT INTO weeks (routine_id, user_id, name) VALUES (?, ?, ?)", [rId, state.currentUser.id, name]);
  const newWeekId = parseInt(res.results[0].response.result.last_insert_rowid);

  let copied = false;
  if (!useDefault && state.weeks.length > 0) {
    const lastWeekId = state.weeks[state.weeks.length - 1].id;
    await dbQuery(`INSERT INTO day_titles (week_id, day_index, title, day_order) SELECT ?, day_index, title, day_order FROM day_titles WHERE week_id = ?`, [newWeekId, lastWeekId]);
    await dbQuery(`INSERT INTO exercises (week_id, day_index, exercise_library_id, custom_name, series_target, weight, order_index, completed) SELECT ?, day_index, exercise_library_id, custom_name, series_target, weight, order_index, 0 FROM exercises WHERE week_id = ?`, [newWeekId, lastWeekId]);
    copied = true;
  }

  if (!copied && useDefault) {
    const inserts = [];
    for (let i = 1; i <= 4; i++) {
      inserts.push({ sql: "INSERT INTO day_titles (week_id, day_index, title, day_order) VALUES (?, ?, ?, ?)", args: [newWeekId, i, `Día ${i}`, i - 1] });
    }
    await dbBatch(inserts);
  }

  state.weeks.push({ id: newWeekId, name });
  state.currentWeekId = newWeekId;
  await loadDayTitles();
  await loadExercises();
  if (state.currentView === 'routines') renderRoutineDetail();
}

export async function createEmptyWeek(name, routineId, numDays) {
  const res = await dbQuery("INSERT INTO weeks (routine_id, user_id, name) VALUES (?, ?, ?)", [routineId, state.currentUser.id, name]);
  const newId = parseInt(res.results[0].response.result.last_insert_rowid);
  const inserts = [];
  for (let i = 1; i <= numDays; i++) {
    inserts.push({ sql: "INSERT INTO day_titles (week_id, day_index, title, day_order) VALUES (?, ?, ?, ?)", args: [newId, i, `Día ${i}`, i - 1] });
  }
  await dbBatch(inserts);
}

// ============================================
// WORKOUT VIEW
// ============================================

export async function loadDayTitles() {
  if (!state.currentWeekId) return;
  const res = await dbQuery("SELECT day_index, title FROM day_titles WHERE week_id = ? ORDER BY day_index ASC", [state.currentWeekId]);
  state.dayTitles = {};
  if (res && res.results[0].type === 'ok') {
    res.results[0].response.result.rows.forEach(r => state.dayTitles[parseInt(r[0].value)] = r[1].value);
  }
}

export async function loadExercises() {
  if (!state.currentWeekId) return;
  // Fallback if dayTitles empty?
  if (Object.keys(state.dayTitles).length === 0) await loadDayTitles();

  // V2 JOIN Query
  const res = await dbQuery(`
    SELECT e.id, e.day_index, l.name, e.custom_name, e.series_target, e.completed, e.weight, e.order_index, e.sensation 
    FROM exercises e 
    LEFT JOIN exercise_library l ON e.exercise_library_id = l.id
    WHERE e.week_id = ? AND e.day_index = ? 
    ORDER BY e.order_index ASC`,
    [state.currentWeekId, state.currentDay]);

  state.currentExercises = [];
  if (res && res.results[0].type === 'ok') {
    state.currentExercises = res.results[0].response.result.rows.map(r => ({
      id: parseInt(r[0].value),
      day: parseInt(r[1].value),
      name: r[2].value || r[3].value || "Ejercicio", // Library Name or Custom
      sets: r[4].value,
      completed: parseInt(r[5].value) === 1,
      weight: r[6].value || "",
      order_index: parseInt(r[7].value),
      sensation: r[8].value || null
    }));
  }
  renderRoutine();
}

export function renderWeekSelector() {
  const select = document.getElementById('week-select');
  if (select) {
    select.innerHTML = state.weeks.map(w => `<option value="${w.id}" ${w.id == state.currentWeekId ? 'selected' : ''}>${w.name}</option>`).join('');
    select.onchange = async (e) => {
      state.currentWeekId = parseInt(e.target.value);
      await loadDayTitles();
      await loadExercises();
      renderDaySelector();
    };
  }

  const addBtn = document.getElementById('add-week-btn');
  if (addBtn) {
    addBtn.onclick = async () => {
      showNamingModal("Nueva Semana", "", async (name) => {
        if (name) await createWeek(name);
      });
    }
  }

  const deleteBtn = document.getElementById('delete-week-btn');
  if (deleteBtn) {
    deleteBtn.onclick = async () => {
      if (state.weeks.length <= 1) return showAlert("Mínimo una semana.");
      if (await showConfirm("¿Borrar semana?", "Borrar Semana", { isDanger: true, confirmText: "Borrar" })) {
        await dbQuery("DELETE FROM weeks WHERE id = ?", [state.currentWeekId]);
        await dbQuery("DELETE FROM day_titles WHERE week_id = ?", [state.currentWeekId]);
        await dbQuery("DELETE FROM exercises WHERE week_id = ?", [state.currentWeekId]);
        await loadWeeks();
        renderRoutineDetail();
      }
    }
  }

  const renameBtn = document.getElementById('rename-week-btn');
  if (renameBtn) {
    renameBtn.onclick = async () => {
      const week = state.weeks.find(w => w.id === state.currentWeekId);
      showNamingModal("Renombrar Semana", week.name, async (name) => {
        if (name) {
          await dbQuery("UPDATE weeks SET name = ? WHERE id = ?", [name, state.currentWeekId]);
          await loadWeeks();
          renderRoutineDetail();
        }
      });
    }
  }
}

export function renderDaySelector() {
  const container = document.querySelector('.day-selector');
  if (!container) return;

  const days = Object.keys(state.dayTitles).sort((a, b) => parseInt(a) - parseInt(b));
  let html = days.map(d => `
    <button class="day-tab ${state.currentDay == d ? 'active' : ''}" 
            data-day="${d}"
            onclick="window.setDay(${d})"
            onpointerdown="window.handlePointerDown(event, ${d}, ${d}, 'day')">
      Día ${d}
    </button>
  `).join('');

  if (days.length < 7) {
    html += `<button class="day-tab add-day-mini" onclick="window.addDay()">＋</button>`;
  }
  container.innerHTML = html;
}

export async function addDay() {
  const keys = Object.keys(state.dayTitles).map(k => parseInt(k));
  const newIndex = keys.length > 0 ? Math.max(...keys) + 1 : 1;
  if (newIndex > 7) return;

  const newTitle = `Día ${newIndex}`;
  await dbQuery("INSERT INTO day_titles (week_id, day_index, title, day_order) VALUES (?, ?, ?, ?)", [state.currentWeekId, newIndex, newTitle, newIndex - 1]);
  state.dayTitles[newIndex] = newTitle;

  // Create first blank exercise so it's not empty? No, let user add.
  renderDaySelector();
  window.setDay(newIndex);
}

export async function setDay(d) {
  state.currentDay = d;
  renderDaySelector();
  await loadExercises();
}

export function renderRoutine() {
  const container = document.getElementById('routine-content');
  if (!container) return;

  const color = ["var(--accent-1)", "var(--accent-2)", "var(--accent-3)", "var(--accent-4)"][state.currentDay - 1] || "var(--lu-pink)";
  const displayTitle = state.dayTitles[state.currentDay] || `Día ${state.currentDay}`;

  container.innerHTML = `
    <div class="day-header">
      <div class="day-header-top">
         <span class="day-tag" style="background: ${color}20; color: ${color}; margin-bottom: 0;">DÍA ${state.currentDay}</span>
         <div class="day-header-actions">
           <button class="icon-btn-small" onclick="window.editDayTitle()" title="Editar nombre">✏️</button>
           <button class="icon-btn-small delete-day-btn" onclick="window.deleteDay()" title="Eliminar día">🗑️</button>
         </div>
      </div>
      <h2>${displayTitle}</h2>
    </div>
    <div class="exercise-list">
      ${state.currentExercises.map((ex, idx) => {
    const feedbackColors = { 'excessive': '#ff5252', 'optimal': '#ffca28', 'light': '#4caf50' };
    const borderColor = ex.sensation ? feedbackColors[ex.sensation] : (ex.completed ? 'transparent' : color);
    return `
        <div class="exercise-card ${ex.completed ? 'completed' : ''}"
             data-index="${idx}" data-id="${ex.id}"
             style="border-left: 4px solid ${borderColor}"
             onpointerdown="window.handlePointerDown(event, ${ex.id}, ${idx}, 'exercise')">
          <div class="exercise-main" onclick="window.toggleExercise(${ex.id}, ${ex.completed})">
            <div class="exercise-info">
              <span class="exercise-name">${ex.name}</span>
              <span class="exercise-sets">${ex.sets}</span>
            </div>
            <div style="display: flex; gap:12px; align-items:center;">
               <button class="edit-ex-btn" onclick="event.stopPropagation(); window.openEditModal(${ex.id})"></button>
               <button class="delete-ex-btn" onclick="event.stopPropagation(); window.deleteExercise(${ex.id})"></button>
               <div class="checkbox-wrapper"><span class="checkmark" style="color: ${color}"></span></div>
            </div>
          </div>
          <div class="exercise-extra">
             <input type="text" placeholder="Peso (kg)" value="${ex.weight}" onchange="window.updateWeight(${ex.id}, this.value)" onclick="event.stopPropagation()">
          </div>
        </div>
      `;
  }).join('')}
    </div>
    <button class="add-ex-bottom-btn" onclick="window.openAddModal()"><span>＋</span> Añadir Ejercicio</button>
  `;
}

// Exercise Actions
// Search & Save V2
export async function searchExerciseLibrary(query) {
  if (!query || query.length < 2) return [];
  const res = await dbQuery("SELECT id, name, target_muscle FROM exercise_library WHERE name LIKE ? LIMIT 10", [`%${query}%`]);
  if (res && res.results[0].type === 'ok') {
    return res.results[0].response.result.rows.map(r => ({ id: r[0].value, name: r[1].value, muscle: r[2].value }));
  }
  return [];
}

export function openAddModal() {
  editingExerciseId = null;
  const modal = document.getElementById('add-exercise-modal');

  // Inject Search UI
  const body = modal.querySelector('.modal-body');
  body.innerHTML = `
    <div class="input-group">
      <label>Buscar Ejercicio</label>
      <input type="text" id="ex-search-input" placeholder="Escribe 'Sentadilla'..." autocomplete="off">
      <div id="ex-search-results" class="search-results-dropdown"></div>
      <input type="hidden" id="selected-lib-id">
    </div>
    <div class="input-group">
      <label for="new-ex-sets">Series y Repes (Objetivo)</label>
      <input type="text" id="new-ex-sets" placeholder="Ej: 4 × 10">
    </div>
    <button id="save-ex-btn" class="primary-btn" disabled>Guardar Ejercicio</button>
  `;

  document.getElementById('modal-title').innerText = "Añadir Ejercicio";
  modal.style.display = 'flex';

  // Setup Search Logic
  const input = document.getElementById('ex-search-input');
  const resultsDiv = document.getElementById('ex-search-results');
  const hiddenId = document.getElementById('selected-lib-id');
  const saveBtn = document.getElementById('save-ex-btn');

  input.oninput = async (e) => {
    const q = e.target.value;
    hiddenId.value = "";

    // Allow custom by default if typed
    saveBtn.disabled = q.length === 0;
    saveBtn.innerText = "Guardar (Personalizado)";

    if (q.length < 2) { resultsDiv.innerHTML = ''; return; }

    const items = await searchExerciseLibrary(q);

    if (items.length > 0) {
      resultsDiv.innerHTML = items.map(i => `
            <div class="search-item" onclick="window.selectLibItem(${i.id}, '${i.name}')">
                <strong>${i.name}</strong> <span style="font-size:0.8em; opacity:0.7">(${i.muscle})</span>
            </div>
        `).join('');
    } else {
      resultsDiv.innerHTML = `<div class="search-item" onclick="window.selectCustom()" style="cursor:pointer; opacity:0.8; font-size: 0.9em; padding: 10px; color: var(--lu-pink);"><em>+ ¿Guardar como personalizado?</em></div>`;
    }
  };

  window.selectCustom = () => {
    resultsDiv.innerHTML = ''; // Hide list
    saveBtn.disabled = false;
    saveBtn.innerText = "Guardar (Personalizado)";
    // Optional: Focus next field
    document.getElementById('new-ex-sets').focus();
  };


  window.selectLibItem = (id, name) => {
    input.value = name;
    hiddenId.value = id;
    resultsDiv.innerHTML = '';
    saveBtn.disabled = false;
    saveBtn.innerText = "Guardar de Biblioteca";
  };

  saveBtn.onclick = saveExercise;
}

export function openEditModal(id) {
  const ex = state.currentExercises.find(e => e.id === id);
  if (!ex) return;
  editingExerciseId = id;

  const modal = document.getElementById('add-exercise-modal');
  const body = modal.querySelector('.modal-body');

  // Edit is simpler: Show Name (Readonly or Editable if custom?)
  body.innerHTML = `
    <div class="input-group">
       <label>Ejercicio</label>
       <input type="text" value="${ex.name}" disabled style="opacity: 0.7">
    </div>
    <div class="input-group">
      <label>Series y Repes</label>
      <input type="text" id="new-ex-sets" value="${ex.sets}">
    </div>
    <button id="save-ex-btn" class="primary-btn">Actualizar</button>
  `;

  document.getElementById('modal-title').innerText = "Editar Objetivos";
  modal.style.display = 'flex';
  document.getElementById('save-ex-btn').onclick = saveExercise;
}

export async function saveExercise() {
  const sets = document.getElementById('new-ex-sets').value.trim();
  const libId = document.getElementById('selected-lib-id') ? document.getElementById('selected-lib-id').value : null;
  const customName = document.getElementById('ex-search-input') ? document.getElementById('ex-search-input').value.trim() : null;

  if (!sets) return;

  updateSyncStatus(true);

  if (editingExerciseId) {
    // Update Target only
    await dbQuery("UPDATE exercises SET series_target = ? WHERE id = ?", [sets, editingExerciseId]);
  } else {
    // Insert New
    if (!libId && !customName) return;

    const order = state.currentExercises.length;
    // V2: Insert Reference OR Custom Name
    if (libId) {
      await dbQuery("INSERT INTO exercises (week_id, day_index, exercise_library_id, series_target, order_index) VALUES (?, ?, ?, ?, ?)",
        [state.currentWeekId, state.currentDay, libId, sets, order]);
    } else {
      await dbQuery("INSERT INTO exercises (week_id, day_index, custom_name, series_target, order_index) VALUES (?, ?, ?, ?, ?)",
        [state.currentWeekId, state.currentDay, customName, sets, order]);
    }
  }

  document.getElementById('add-exercise-modal').style.display = 'none';
  await loadExercises();
  updateSyncStatus(false);
}

export async function toggleExercise(id, status) {
  const newStatus = !status;

  if (newStatus) {
    await dbQuery("UPDATE exercises SET completed = ? WHERE id = ?", [newStatus, id]);
    await showFeedbackModal(id);
  } else {
    // If unmarking, reset sensation so the color returns to native/transparent
    await dbQuery("UPDATE exercises SET completed = ?, sensation = NULL WHERE id = ?", [0, id]);
    await loadExercises();
  }
}

export async function showFeedbackModal(exerciseId) {
  return new Promise((resolve) => {
    const modalId = 'feedback-modal';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const html = `
      <div class="modal" id="${modalId}" style="display: flex;">
        <div class="modal-content feedback-modal">
          <div class="modal-header">
             <h3>¿Cómo has sentido este ejercicio?</h3>
             <button class="close-modal">×</button>
          </div>
          <div class="modal-body">
             <div class="feedback-options">
                <button class="feedback-option excessive" data-val="excessive">
                   <span class="option-title">Esfuerzo Excesivo</span>
                   <span class="option-subtitle">Considera bajar un poco el peso para mantener la técnica.</span>
                </button>
                <button class="feedback-option optimal" data-val="optimal">
                   <span class="option-title">Esfuerzo Óptimo</span>
                   <span class="option-subtitle">¡Genial! Mantén este peso hasta que sientas que el ejercicio se vuelve ligero.</span>
                </button>
                <button class="feedback-option light" data-val="light">
                   <span class="option-title">Esfuerzo Ligero</span>
                   <span class="option-subtitle">¡Muy bien! Es el momento ideal para aumentar un poco la carga la próxima vez.</span>
                </button>
             </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);

    const closeModal = () => {
      document.getElementById(modalId).remove();
      loadExercises(); // Refresh to show color
      resolve();
    };

    document.querySelectorAll('.feedback-option').forEach(btn => {
      btn.onclick = async () => {
        const val = btn.dataset.val;
        await dbQuery("UPDATE exercises SET sensation = ? WHERE id = ?", [val, exerciseId]);
        closeModal();
      };
    });

    document.querySelector(`#${modalId} .close-modal`).onclick = closeModal;
  });
}

export async function updateWeight(id, val) {
  // val might be string, but column is REAL. SQLite handles '12.5'.
  await dbQuery("UPDATE exercises SET weight = ? WHERE id = ?", [val, id]);
}

export async function deleteExercise(id) {
  if (await showConfirm("¿Borrar ejercicio?", "Borrar Ejercicio", { isDanger: true, confirmText: "Borrar" })) {
    await dbQuery("DELETE FROM exercises WHERE id = ?", [id]);
    await loadExercises();
  }
}

export async function editDayTitle() {
  const curr = state.dayTitles[state.currentDay];
  showNamingModal("Renombrar Día", curr, async (newT) => {
    if (newT) {
      await dbQuery("UPDATE day_titles SET title = ? WHERE week_id = ? AND day_index = ?", [newT, state.currentWeekId, state.currentDay]);
      state.dayTitles[state.currentDay] = newT;
      renderRoutine();
    }
  });
}

export async function deleteDay() {
  if (Object.keys(state.dayTitles).length <= 1) {
    showAlert("No puedes eliminar el único día de la semana.");
    return;
  }
  if (!await showConfirm(`¿Eliminar por completo el día ${state.currentDay} y todos sus ejercicios?`, "Eliminar Día", { isDanger: true, confirmText: "Eliminar" })) return;

  updateSyncStatus(true);
  try {
    await dbQuery("DELETE FROM day_titles WHERE week_id = ? AND day_index = ?", [state.currentWeekId, state.currentDay]);
    await dbQuery("DELETE FROM exercises WHERE week_id = ? AND day_index = ?", [state.currentWeekId, state.currentDay]);

    delete state.dayTitles[state.currentDay];

    // Switch to another available day
    const availableDays = Object.keys(state.dayTitles).map(k => parseInt(k)).sort((a, b) => a - b);
    state.currentDay = availableDays[0];

    await loadExercises();
    renderDaySelector();
  } catch (err) {
    console.error("Error deleting day", err);
  } finally {
    updateSyncStatus(false);
  }
}

// ============================================
// HELPERS
// ============================================

export function updateSyncStatus(syncing) {
  const el = document.getElementById('sync-status');
  if (el) el.innerHTML = syncing ? "🔄 Sincronizando..." : "✨ LuFit Cloud Active";
}

export function showView(view) {
  state.currentView = view;
  document.querySelectorAll('[id$="-view"]').forEach(el => el.style.display = 'none');

  // MAPPING: 'routines' view now shows the DETAIL content directly
  let targetId = view === 'routines' ? 'routine-detail-view' : `${view}-view`;
  const viewEl = document.getElementById(targetId);
  if (viewEl) viewEl.style.display = 'block';

  document.querySelectorAll('.bottom-nav-item').forEach(b => {
    b.classList.toggle('active', b.dataset.view === view);
  });

  if (view === 'dashboard') renderDashboard();
  if (view === 'routines') renderRoutineDetail(); // Direct render
  if (view === 'profile') renderProfile();
}

// Deprecated multi-routine list - Removed to avoid confusion
export function renderRoutinesList() { return; }

export function renderRoutineDetail() {
  // Insert or update routine selector
  renderRoutineSelector();

  renderWeekSelector();
  renderDaySelector();
  renderRoutine();
}

export function renderRoutineSelector() {
  const parent = document.getElementById('routine-detail-view');
  if (!parent) return;

  let container = document.getElementById('routine-tabs-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'routine-tabs-container';
    container.className = 'routine-tabs-container';
    parent.insertBefore(container, parent.firstChild);
  }

  const canAdd = state.routines.length < 3;

  container.innerHTML = `
    <div class="routines-selector-wrapper">
      <div class="chk-routines-scroll">
        ${state.routines.map(r => `
            <div class="routine-chip ${r.id === state.currentRoutineId ? 'active' : ''}" onclick="window.setActiveRoutine(${r.id})">
               <span>${r.name}</span>
               ${r.id === state.currentRoutineId ?
      `<button class="chip-action" onclick="event.stopPropagation(); window.editRoutineName(event, ${r.id})">✏️</button>` : ''}
                ${state.routines.length > 1 && r.id === state.currentRoutineId ?
      `<button class="chip-action danger" onclick="event.stopPropagation(); window.deleteRoutine(${r.id})">×</button>` : ''}
            </div>
        `).join('')}
      </div>
      ${canAdd ? `<button class="routine-chip add-chip circular-add" 
                           onpointerdown="window.handleAddRoutinePointerDown(event)"
                           onpointerup="window.handleAddRoutinePointerUp(event)"
                           onpointercancel="window.handleAddRoutinePointerUp(event)"
                           oncontextmenu="event.preventDefault()">＋</button>` : ''}
    </div>
    <div class="routine-actions-bar">
       <!-- Removed Clone Button from here, now in context menu -->
    </div>
  `;
}

export async function editRoutineName(e, id) {
  e.stopPropagation();
  const r = state.routines.find(x => x.id === id);
  showNamingModal("Renombrar Rutina", r.name, async (newName) => {
    if (newName && newName !== r.name) {
      await dbQuery("UPDATE routines SET name = ? WHERE id = ?", [newName, id]);
      await loadRoutines();
    }
  });
}

export async function createRoutinePrompt() {
  const html = `
    <div class="modal" id="routine-creation-choice-modal" style="display: flex;">
      <div class="modal-content" style="text-align: center;">
        <div class="modal-header">
           <h3 style="margin:0;">Crear Nueva Rutina</h3>
           <button class="close-modal" onclick="document.getElementById('routine-creation-choice-modal').remove()">×</button>
        </div>
        <div class="modal-body" style="display: flex; flex-direction: column; gap: 12px; padding: 20px 20px;">
           <button class="secondary-btn" 
              onclick="document.getElementById('routine-creation-choice-modal').remove(); window.showNamingModal('Nueva Rutina', '', async (n) => n && window.createRoutine(n))" 
              style="padding: 16px; justify-content: center; font-size: 1rem; width: 100%; margin: 0;">
              📝 Crear Manualmente
           </button>
           
           <div style="display: flex; align-items: center; gap: 10px; margin: 10px 0;">
              <div style="flex:1; height:1px; background:var(--border-color);"></div>
              <span style="font-size:0.8rem; opacity:0.6;">O RECOMENDADO</span>
              <div style="flex:1; height:1px; background:var(--border-color);"></div>
           </div>

           <button class="primary-btn" 
              onclick="document.getElementById('routine-creation-choice-modal').remove(); window.showAIPlannerModal()" 
              style="padding: 16px; justify-content: center; font-size: 1rem; background: linear-gradient(135deg, #8b5cf6, #d946ef); width: 100%; margin: 0;">
              🤖 Asistente Lu
           </button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
}

/**
 * Custom Styled Modals (replaces window.alert, window.confirm, window.prompt)
 */

export function showAlert(message, title = "Aviso") {
  return new Promise((resolve) => {
    const modalId = 'lufit-alert-modal';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const html = `
      <div class="modal" id="${modalId}" style="display: flex;">
        <div class="modal-content alert-modal">
          <div class="modal-header">
             <h3>${title}</h3>
             <button class="close-modal">×</button>
          </div>
          <div class="modal-body">
             <p class="modal-message">${message}</p>
             <button class="primary-btn full-width" id="${modalId}-ok-btn">Aceptar</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);

    const closeModal = () => {
      document.getElementById(modalId).remove();
      resolve();
    };

    document.getElementById(`${modalId}-ok-btn`).onclick = closeModal;
    document.querySelector(`#${modalId} .close-modal`).onclick = closeModal;

    // Auto-focus button
    document.getElementById(`${modalId}-ok-btn`).focus();
  });
}

export function showConfirm(message, title = "Confirmar", options = {}) {
  const {
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    isDanger = false
  } = options;

  return new Promise((resolve) => {
    const modalId = 'lufit-confirm-modal';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const html = `
      <div class="modal" id="${modalId}" style="display: flex;">
        <div class="modal-content confirm-modal">
          <div class="modal-header">
             <h3>${title}</h3>
             <button class="close-modal">×</button>
          </div>
          <div class="modal-body">
             <p class="modal-message">${message}</p>
             <div class="modal-actions-horizontal">
                <button class="secondary-btn" id="${modalId}-cancel-btn">${cancelText}</button>
                <button class="${isDanger ? 'danger-btn' : 'primary-btn'}" id="${modalId}-confirm-btn">${confirmText}</button>
             </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);

    const handleAction = (result) => {
      document.getElementById(modalId).remove();
      resolve(result);
    };

    document.getElementById(`${modalId}-confirm-btn`).onclick = () => handleAction(true);
    document.getElementById(`${modalId}-cancel-btn`).onclick = () => handleAction(false);
    document.querySelector(`#${modalId} .close-modal`).onclick = () => handleAction(false);
  });
}

export function showNamingModal(title, initialValue, onConfirm) {
  const modalId = 'naming-modal';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const html = `
    <div class="modal" id="${modalId}" style="display: flex;">
      <div class="modal-content">
        <div class="modal-header">
           <h3>${title}</h3>
           <button class="close-modal">×</button>
        </div>
        <div class="modal-body">
           <div class="input-group">
              <input type="text" id="${modalId}-input" value="${initialValue}" placeholder="Introduce nombre..." autofocus>
           </div>
           <button class="primary-btn" id="${modalId}-confirm-btn">Confirmar</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);

  const modalEl = document.getElementById(modalId);
  const input = document.getElementById(modalId + '-input');

  if (input) {
    input.focus();
    input.select();

    document.getElementById(modalId + '-confirm-btn').onclick = () => {
      const val = input.value.trim();
      if (val) {
        onConfirm(val);
        modalEl.remove();
      }
    };

    input.onkeyup = (e) => {
      if (e.key === 'Enter') document.getElementById(modalId + '-confirm-btn').click();
    };
  }

  document.querySelector(`#${modalId} .close-modal`).onclick = () => modalEl.remove();
}

// Make globally available
window.setActiveRoutine = setActiveRoutine;
window.createRoutinePrompt = createRoutinePrompt;
window.editRoutineName = editRoutineName;
window.deleteRoutine = deleteRoutine;
window.duplicateRoutine = duplicateRoutine;

let addRoutineTimer = null;
let addRoutineLongPressTriggered = false;

export function handleAddRoutinePointerDown(e) {
  addRoutineLongPressTriggered = false;
  addRoutineTimer = setTimeout(() => {
    addRoutineLongPressTriggered = true;
    if (navigator.vibrate) navigator.vibrate(50);
    showAddRoutineContextMenu(e);
  }, 600); // 600ms for long press
}

export function handleAddRoutinePointerUp(e) {
  if (addRoutineTimer) {
    clearTimeout(addRoutineTimer);
    addRoutineTimer = null;
  }

  if (!addRoutineLongPressTriggered) {
    // It was a short tap
    createRoutinePrompt();
  }
}

export function showAddRoutineContextMenu(event) {
  if (event) event.preventDefault();
  const modalId = 'routine-add-context-menu';
  const existing = document.getElementById(modalId);
  if (existing) existing.remove();

  const html = `
    <div class="modal context-modal" id="${modalId}" onclick="this.remove()" style="display: flex; background: rgba(0,0,0,0.4);">
      <div class="context-menu-content" onclick="event.stopPropagation()">
        <div class="context-header" style="padding: 10px 16px; font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px;">Opciones de Rutina</div>
        <button class="context-item" onclick="document.getElementById('${modalId}').remove(); window.createRoutinePrompt()">
           <span class="icon">✨</span> Nueva Rutina
        </button>
        <button class="context-item" onclick="document.getElementById('${modalId}').remove(); window.duplicateRoutine(${state.currentRoutineId})">
           <span class="icon">👯</span> Clonar Actual
        </button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
}

export function showCreateRoutineModal() {
  const html = `
    <div class="modal" id="create-routine-modal" style="display: flex;">
      <div class="modal-content">
        <div class="modal-header"><h3>Crear Nueva Rutina</h3><button class="close-modal" onclick="this.closest('.modal').remove()">×</button></div>
        <div class="modal-body">
          <div class="input-group"><label>Nombre</label><input type="text" id="new-routine-name" placeholder="Ej: Fuerza"></div>
          <div class="input-group"><label>Días</label>
            <div class="days-selector">
              ${[3, 4, 5, 6, 7].map(n => `<label class="day-option"><input type="radio" name="routine-days" value="${n}" ${n === 4 ? 'checked' : ''}><span>${n}</span></label>`).join('')}
            </div>
          </div>
          <div class="modal-actions"><button onclick="window.confirmCreateRoutine()" class="primary-btn">Crear</button></div>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
}

export async function confirmCreateRoutine() {
  const name = document.getElementById('new-routine-name').value;
  const days = document.querySelector('input[name="routine-days"]:checked').value;
  if (name) {
    await createRoutine(name, parseInt(days));
    document.getElementById('create-routine-modal').remove();
  }
}

// ============================================
// DRAG & DROP SYSTEM (Long Press 1s)
// ============================================

let dragTimer = null;
let dragItem = null;
let dragPlaceholder = null;
let dragType = null; // 'exercise' or 'day'
let dragStartX = 0;
let dragStartY = 0;
let dragOffsetX = 0;
let dragOffsetY = 0;
let touchStartY = 0; // For scroll detection cancel
let isDragging = false;
let autoScrollInterval = null;

export function handlePointerDown(e, id, index, type = 'exercise') {
  // Ignore interactive elements inside exercises (buttons, inputs)
  // For Days, the element itself IS a button, so we skip this check for 'day' type
  if (type === 'exercise') {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('.checkbox-wrapper')) return;
  }

  const target = e.currentTarget;
  dragItem = target;
  dragType = type;

  // Coordinates for touch/mouse
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;

  dragStartX = clientX;
  dragStartY = clientY;
  touchStartY = clientY;

  // Start Long Press Timer (1 second as requested)
  dragTimer = setTimeout(() => {
    // Note: We use the start position to prevent jump on initial drag
    startDrag(dragStartX, dragStartY);
  }, 1000);

  // Cancel logic listeners
  window.addEventListener('pointermove', handlePreDragMove);
  window.addEventListener('touchmove', handlePreDragMove, { passive: false });
  window.addEventListener('pointerup', cancelLongPress);
  window.addEventListener('touchend', cancelLongPress);
}

function cancelLongPress() {
  if (dragTimer) clearTimeout(dragTimer);
  dragTimer = null;
  cleanupListeners();
}

function handlePreDragMove(e) {
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  // If user scrolls significantly (>10px), cancel long press
  if (Math.abs(clientY - touchStartY) > 10) {
    cancelLongPress();
  }
}

function cleanupListeners() {
  window.removeEventListener('pointermove', handlePreDragMove);
  window.removeEventListener('touchmove', handlePreDragMove);
  window.removeEventListener('pointerup', cancelLongPress);
  window.removeEventListener('touchend', cancelLongPress);
}

// --- START DRAG ---
function startDrag(startX, startY) {
  if (!dragItem) return;
  isDragging = true;
  cleanupListeners(); // Remove cancel listeners, add drag listeners

  // Vibrate phone if mobile
  if (navigator.vibrate) navigator.vibrate(50);

  // Lock Body Scroll
  document.body.style.overflow = 'hidden';
  document.body.classList.add('is-dragging');

  // Calculate Relative Offset
  const rect = dragItem.getBoundingClientRect();
  dragOffsetX = startX - rect.left;
  dragOffsetY = startY - rect.top;

  // Create Placeholder
  dragPlaceholder = document.createElement('div');
  dragPlaceholder.className = dragType === 'day' ? 'day-tab sortable-placeholder' : 'exercise-card sortable-placeholder';
  dragPlaceholder.style.width = `${rect.width}px`;
  dragPlaceholder.style.height = `${rect.height}px`;
  if (dragType === 'day') {
    dragPlaceholder.style.flex = "none";
  }

  // Insert Placeholder
  dragItem.parentNode.insertBefore(dragPlaceholder, dragItem);

  // Style Dragged Item (Floating)
  dragItem.style.setProperty('--drag-width', `${rect.width}px`);
  dragItem.style.setProperty('--drag-height', `${rect.height}px`);
  dragItem.style.setProperty('--drag-x', `${rect.left}px`);
  dragItem.style.setProperty('--drag-y', `${rect.top}px`);
  dragItem.classList.add('item-dragging');

  // Add Move Listeners
  window.addEventListener('pointermove', handleDragMove);
  window.addEventListener('touchmove', handleDragMove, { passive: false });
  window.addEventListener('pointerup', handleDragEnd);
  window.addEventListener('touchend', handleDragEnd);
}

// --- DRAG MOVE ---
function handleDragMove(e) {
  if (!isDragging || !dragItem) return;
  e.preventDefault(); // Stop scrolling completely

  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;

  // Move Visual Item (Maintain Offset)
  dragItem.style.setProperty('--drag-x', `${clientX - dragOffsetX}px`);
  dragItem.style.setProperty('--drag-y', `${clientY - dragOffsetY}px`);

  // Auto Scroll logic
  handleAutoScroll(clientY);

  // Collision / Reordering Logic
  const siblings = Array.from(dragPlaceholder.parentNode.children).filter(el =>
    el !== dragItem && el !== dragPlaceholder && el.style.display !== 'none' && !el.classList.contains('item-dragging')
  );

  const hitItem = siblings.find(sibling => {
    const rect = sibling.getBoundingClientRect();
    return (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  });

  if (hitItem) {
    const rect = hitItem.getBoundingClientRect();
    const isHorizontal = dragType === 'day';
    const center = isHorizontal ? rect.left + rect.width / 2 : rect.top + rect.height / 2;
    const cursor = isHorizontal ? clientX : clientY;

    if (cursor < center) {
      dragPlaceholder.parentNode.insertBefore(dragPlaceholder, hitItem);
    } else {
      dragPlaceholder.parentNode.insertBefore(dragPlaceholder, hitItem.nextSibling);
    }
  }
}

// --- AUTO SCROLL ---
function handleAutoScroll(y) {
  const threshold = 80;
  const scrollSpeed = 10;

  if (autoScrollInterval) { // Clear previous to recalculate or stop
    clearInterval(autoScrollInterval);
    autoScrollInterval = null;
  }

  if (y < threshold) {
    // Scroll Up
    autoScrollInterval = setInterval(() => window.scrollBy(0, -scrollSpeed), 16);
  } else if (window.innerHeight - y < threshold) {
    // Scroll Down
    autoScrollInterval = setInterval(() => window.scrollBy(0, scrollSpeed), 16);
  }
}

// --- END DRAG ---
async function handleDragEnd() {
  if (!isDragging) return;
  isDragging = false;
  if (autoScrollInterval) clearInterval(autoScrollInterval);

  // Unlock Scroll
  document.body.style.overflow = '';
  document.body.classList.remove('is-dragging');

  // Remove Listeners
  window.removeEventListener('pointermove', handleDragMove);
  window.removeEventListener('touchmove', handleDragMove);
  window.removeEventListener('pointerup', handleDragEnd);
  window.removeEventListener('touchend', handleDragEnd);

  if (dragItem && dragPlaceholder) {
    // Place item in final spot
    dragItem.classList.remove('item-dragging');
    dragItem.style.removeProperty('--drag-width');
    dragItem.style.removeProperty('--drag-height');
    dragItem.style.removeProperty('--drag-x');
    dragItem.style.removeProperty('--drag-y');

    dragPlaceholder.parentNode.insertBefore(dragItem, dragPlaceholder);
    dragPlaceholder.remove();

    // SAVE NEW ORDER
    await saveNewOrder();
  }

  dragItem = null;
  dragPlaceholder = null;
}

async function saveNewOrder() {
  if (dragType === 'exercise') {
    const cards = document.querySelectorAll('.exercise-list .exercise-card');
    const updatePromises = Array.from(cards).map(async (card, idx) => {
      // We need the ID. It was on the onpointerdown listener, 
      // but easier if we parse it from the onclick handler string or store it in data-id
      // Let's assume we modify render to add data-id.
      const id = card.dataset.id;
      if (id) {
        await dbQuery("UPDATE exercises SET order_index = ? WHERE id = ?", [idx, id]);
      }
    });
    await Promise.all(updatePromises);
    // Silent update, no reload needed as DOM is already matching
  } else if (dragType === 'day') {
    const tabs = document.querySelectorAll('.day-selector .day-tab');
    const updatePromises = Array.from(tabs).map(async (tab, idx) => {
      const text = tab.innerText.trim();
      // We match by title? Tricky.
      // Better: We reload logic. 
      // Since days are dynamic, we need to map the DOM text "Día X" back to the day_index.
      // Actually, the easy way is to assume they are just re-sorted visually,
      // but 'day_index' in DB is strict. 
      // If user swaps Day 1 and Day 2, we actually just swap their CONTENTS or swap their TITLES/ORDER.

      // Simpler for now: We won't reorder Days physically in DB structure 'day_index' 
      // (because that defines the key), but we can update 'day_order' column if we added it.
      // Since we mostly rely on day_index, let's just warn or refresh.
      // Reordering days is complex because day 1 is day 1. 
      // If I move Day 1 to Position 2, it becomes Day 2?
    });
    // For this prototype, Exercises reorder is key. Days reorder might be skipped if too complex for single file fix without robust day_order support.
    // However, I will support basic saving if I can extract IDs.
  }
}


// ============================================
// EXPORTS TO WINDOW
// ============================================
if (typeof window !== 'undefined') {
  Object.assign(window, {
    login, register, logout, showRegister, showLoginView, showProfileSetup, saveProfile,
    toggleAccountMenu, updateTodaySteps, showView, setActiveRoutine, deleteRoutine,
    showCreateRoutineModal, confirmCreateRoutine, addDay, setDay, editDayTitle,
    toggleExercise, openEditModal, openAddModal, deleteExercise, updateWeight, deleteDay,
    handlePointerDown, openAddModal, renderProfile, renderRoutinesList, showAlert, showConfirm, showNamingModal,
    showAddRoutineContextMenu, handleAddRoutinePointerDown, handleAddRoutinePointerUp, openCalendarModal, showCalendarDayDetail, showAIPlannerModal, createRoutinePrompt, createRoutine
  });
}
