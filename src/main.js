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
let dayTitles = {};
let editingExerciseId = null;
let dragTarget = null;
let dragStartY = 0;
let dragStartIndex = -1;
let dragCurrentIndex = -1;
let longPressTimer = null;
let isDragging = false;
let scrollInterval = null;
let lastPointerEvent = null;
let dragStartPageY = 0;
let dragInitialRect = null;

let daysOrder = [];
let isDayDragging = false;
let dayDragTarget = null;
let dayDragStartX = 0;
let dayDragStartIndex = -1;
let dayDragCurrentIndex = -1;
let dayLongPressTimer = null;

let currentUser = JSON.parse(localStorage.getItem('lufit_user')) || null;

// Database Operations
async function dbBatch(requests) {
  if (!DB_URL || !DB_TOKEN) return null;
  const cleanUrl = DB_URL.replace('libsql://', 'https://') + "/v2/pipeline";

  const formattedRequests = requests.map(req => ({
    type: 'execute',
    stmt: {
      sql: req.sql,
      args: (req.args || []).map(a => {
        if (typeof a === 'boolean') return { type: 'integer', value: a ? "1" : "0" };
        if (typeof a === 'number') return { type: 'integer', value: a.toString() };
        if (a === null) return { type: 'null' };
        return { type: 'text', value: a.toString() };
      })
    }
  }));

  try {
    const response = await fetch(cleanUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${DB_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: formattedRequests })
    });
    return await response.json();
  } catch (error) {
    console.error("DB Batch Error:", error);
    return null;
  }
}

async function dbQuery(sql, args = []) {
  const res = await dbBatch([{ sql, args }]);
  return res;
}

async function initApp() {
  updateSyncStatus(true);

  // Initialize DB Tables
  await dbBatch([
    { sql: 'CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, email TEXT UNIQUE, is_verified INTEGER DEFAULT 0, verification_code TEXT)' },
    { sql: 'CREATE TABLE IF NOT EXISTS weeks (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, name TEXT)' },
    { sql: 'CREATE TABLE IF NOT EXISTS exercises (id INTEGER PRIMARY KEY AUTOINCREMENT, week_id INTEGER, day_index INTEGER, name TEXT, sets TEXT, completed INTEGER DEFAULT 0, weight TEXT DEFAULT \'\', order_index INTEGER DEFAULT 0)' },
    { sql: 'CREATE TABLE IF NOT EXISTS day_titles (week_id INTEGER, day_index INTEGER, title TEXT, PRIMARY KEY(week_id, day_index))' }
  ]);

  // Migrations
  await dbQuery("ALTER TABLE users ADD COLUMN email TEXT UNIQUE").catch(() => { });
  await dbQuery("ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0").catch(() => { });
  await dbQuery("ALTER TABLE users ADD COLUMN verification_code TEXT").catch(() => { });
  await dbQuery("ALTER TABLE weeks ADD COLUMN user_id INTEGER").catch(() => { });

  // Seed/Update Lucia with email and verified status
  await dbQuery("INSERT OR IGNORE INTO users (username, password, email, is_verified) VALUES (?, ?, ?, ?)", ["lucia", "364391", "lucia@lufit.com", 1]);
  await dbQuery("UPDATE users SET email = 'lucia@lufit.com', is_verified = 1 WHERE username = 'lucia' AND email IS NULL");

  if (!currentUser) {
    showLogin();
    updateSyncStatus(false);
    return;
  }

  // Ensure old data is assigned to lucia if user_id is null (migration)
  const luciaRes = await dbQuery("SELECT id FROM users WHERE username = ?", ["lucia"]);
  if (luciaRes && luciaRes.results[0].type === 'ok') {
    const luciaId = luciaRes.results[0].response.result.rows[0][0].value;
    await dbQuery("UPDATE weeks SET user_id = ? WHERE user_id IS NULL", [luciaId]);
  }

  hideLogin();
  await loadWeeks();
  updateSyncStatus(false);
}

async function loadWeeks() {
  const weeksRes = await dbQuery("SELECT id, name FROM weeks WHERE user_id = ? ORDER BY id ASC", [currentUser.id]);
  if (weeksRes && weeksRes.results[0].type === 'ok') {
    weeks = weeksRes.results[0].response.result.rows.map(r => ({ id: r[0].value, name: r[1].value }));
  }

  if (weeks.length === 0) {
    await createWeek("Semana 1");
  } else {
    currentWeekId = weeks[weeks.length - 1].id;
    await checkAndSeedDayTitles();
    await checkAndSeedExercises();
    await loadDayTitles();
    await loadExercises();
  }

  renderWeekSelector();
}

function showLogin() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('register-view').style.display = 'none';
  document.getElementById('verify-view').style.display = 'none';
  document.getElementById('login-view').style.display = 'block';
  document.getElementById('app-content').style.display = 'none';
}

function showRegister() {
  document.getElementById('login-view').style.display = 'none';
  document.getElementById('register-view').style.display = 'block';
}

function showVerify(email) {
  document.getElementById('login-view').style.display = 'none';
  document.getElementById('register-view').style.display = 'none';
  document.getElementById('verify-view').style.display = 'block';
  const display = document.getElementById('verify-email-display');
  if (display) display.innerText = email;
}

function hideLogin() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-content').style.display = 'flex';
  if (currentUser) {
    const nameEl = document.getElementById('user-display-name');
    if (nameEl) nameEl.innerText = currentUser.username;
  }
}

async function login() {
  const userIn = document.getElementById('login-username').value.trim().toLowerCase();
  const passIn = document.getElementById('login-password').value.trim();
  const errorMsg = document.getElementById('login-error');

  if (!userIn || !passIn) return;

  updateSyncStatus(true);
  const res = await dbQuery("SELECT id, username, is_verified, email FROM users WHERE (username = ? OR email = ?) AND password = ?", [userIn, userIn, passIn]);

  if (res && res.results[0].type === 'ok' && res.results[0].response.result.rows.length > 0) {
    const row = res.results[0].response.result.rows[0];
    const user = {
      id: parseInt(row[0].value),
      username: row[1].value,
      is_verified: parseInt(row[2].value) === 1,
      email: row[3].value
    };

    if (!user.is_verified) {
      showVerify(user.email);
      updateSyncStatus(false);
      return;
    }

    currentUser = user;
    localStorage.setItem('lufit_user', JSON.stringify(user));
    errorMsg.innerText = "";
    initApp();
  } else {
    errorMsg.innerText = "Usuario o contraseña incorrectos";
  }
  updateSyncStatus(false);
}

function logout() {
  localStorage.removeItem('lufit_user');
  currentUser = null;
  weeks = [];
  location.reload();
}

async function register() {
  const userIn = document.getElementById('reg-username').value.trim().toLowerCase();
  const emailIn = document.getElementById('reg-email').value.trim().toLowerCase();
  const passIn = document.getElementById('reg-password').value.trim();
  const errorMsg = document.getElementById('reg-error');

  if (!userIn || !emailIn || !passIn) {
    errorMsg.innerText = "Completa todos los campos";
    return;
  }

  updateSyncStatus(true);

  // Check if username taken
  const checkUser = await dbQuery("SELECT id FROM users WHERE username = ?", [userIn]);
  if (checkUser && checkUser.results[0].response.result.rows.length > 0) {
    errorMsg.innerText = "Ese nombre de usuario ya existe";
    updateSyncStatus(false);
    return;
  }

  // Check if email taken
  const checkEmail = await dbQuery("SELECT id FROM users WHERE email = ?", [emailIn]);
  if (checkEmail && checkEmail.results[0].response.result.rows.length > 0) {
    errorMsg.innerText = "Ese correo ya está registrado";
    updateSyncStatus(false);
    return;
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const res = await dbQuery("INSERT INTO users (username, email, password, verification_code, is_verified) VALUES (?, ?, ?, ?, 0)", [userIn, emailIn, passIn, code]);

  if (res && res.results[0].type === 'ok') {
    alert(`[Simulación Email] Código para ${emailIn}: ${code}`);
    showVerify(emailIn);
  } else {
    errorMsg.innerText = "Error al registrar";
  }
  updateSyncStatus(false);
}

async function verifyCode() {
  const codeIn = document.getElementById('verify-code').value.trim();
  const email = document.getElementById('verify-email-display').innerText;
  const errorMsg = document.getElementById('verify-error');

  updateSyncStatus(true);
  const res = await dbQuery("SELECT id, username FROM users WHERE email = ? AND verification_code = ?", [email, codeIn]);

  if (res && res.results[0].type === 'ok' && res.results[0].response.result.rows.length > 0) {
    await dbQuery("UPDATE users SET is_verified = 1 WHERE email = ?", [email]);
    const row = res.results[0].response.result.rows[0];
    const user = { id: parseInt(row[0].value), username: row[1].value };
    currentUser = user;
    localStorage.setItem('lufit_user', JSON.stringify(user));
    hideLogin();
    initApp();
  } else {
    errorMsg.innerText = "Código incorrecto";
  }
  updateSyncStatus(false);
}

async function checkAndSeedDayTitles() {
  const res = await dbQuery("SELECT COUNT(*) FROM day_titles WHERE week_id = ?", [currentWeekId]);
  if (res && res.results[0].type === 'ok') {
    const count = parseInt(res.results[0].response.result.rows[0][0].value);
    if (count === 0) {
      const inserts = DEFAULT_ROUTINE.map((d, i) => ({
        sql: "INSERT INTO day_titles (week_id, day_index, title, day_order) VALUES (?, ?, ?, ?)",
        args: [currentWeekId, d.day, d.title, i]
      }));
      await dbBatch(inserts);
    }
  }
}

async function checkAndSeedExercises() {
  const res = await dbQuery("SELECT COUNT(*) FROM exercises WHERE week_id = ?", [currentWeekId]);
  if (res && res.results[0].type === 'ok') {
    const count = parseInt(res.results[0].response.result.rows[0][0].value);
    if (count === 0) {
      const inserts = [];
      for (const day of DEFAULT_ROUTINE) {
        for (const ex of day.exs) {
          inserts.push({
            sql: "INSERT INTO exercises (week_id, day_index, name, sets, order_index) VALUES (?, ?, ?, ?, ?)",
            args: [currentWeekId, day.day, ex.name, ex.sets, 0]
          });
        }
      }
      await dbBatch(inserts);
    }
  }
}

async function createWeek(name) {
  const res = await dbQuery("INSERT INTO weeks (user_id, name) VALUES (?, ?)", [currentUser.id, name]);
  if (!res || res.results[0].type !== 'ok') return;

  const newId = parseInt(res.results[0].response.result.last_insert_rowid);

  const inserts = [];
  // Seed titles
  DEFAULT_ROUTINE.forEach((d, i) => {
    inserts.push({
      sql: "INSERT INTO day_titles (week_id, day_index, title, day_order) VALUES (?, ?, ?, ?)",
      args: [newId, d.day, d.title, i]
    });
  });
  // Seed exercises
  for (const day of DEFAULT_ROUTINE) {
    for (const ex of day.exs) {
      inserts.push({
        sql: "INSERT INTO exercises (week_id, day_index, name, sets, order_index) VALUES (?, ?, ?, ?, ?)",
        args: [newId, day.day, ex.name, ex.sets, 0]
      });
    }
  }
  await dbBatch(inserts);

  weeks.push({ id: newId, name });
  currentWeekId = newId;
  await loadDayTitles();
  await loadExercises();
  renderWeekSelector();
  renderRoutine();
}

async function loadDayTitles() {
  if (!currentWeekId) return;
  const res = await dbQuery("SELECT day_index, title, day_order FROM day_titles WHERE week_id = ? ORDER BY day_order ASC, day_index ASC", [currentWeekId]);
  if (res && res.results[0].type === 'ok') {
    dayTitles = {};
    daysOrder = [];
    res.results[0].response.result.rows.forEach(r => {
      const idx = parseInt(r[0].value);
      dayTitles[idx] = r[1].value;
      daysOrder.push({ index: idx, title: r[1].value, order: parseInt(r[2].value || "0") });
    });
  }
  renderDaySelector();
}

async function loadExercises() {
  if (!currentWeekId) return;
  const res = await dbQuery("SELECT id, day_index, name, sets, completed, weight, order_index FROM exercises WHERE week_id = ? AND day_index = ? ORDER BY order_index ASC, id ASC", [currentWeekId, currentDay]);
  if (res && res.results[0].type === 'ok') {
    const rows = res.results[0].response.result.rows;
    currentExercises = rows.map(r => ({
      id: parseInt(r[0].value),
      day: parseInt(r[1].value),
      name: r[2].value,
      sets: r[3].value,
      completed: parseInt(r[4].value) === 1,
      weight: r[5].value || "",
      order_index: parseInt(r[6].value || "0")
    }));
  }
  renderRoutine();
}

function renderWeekSelector() {
  const select = document.getElementById('week-select');
  if (!select) return;
  select.innerHTML = weeks.map(w => `<option value="${w.id}" ${w.id == currentWeekId ? 'selected' : ''}>${w.name}</option>`).join('');
}

async function editDayTitle() {
  const oldTitle = dayTitles[currentDay] || `Día ${currentDay}`;
  const newTitle = prompt("Cambiar nombre del día:", oldTitle);
  if (newTitle && newTitle !== oldTitle) {
    dayTitles[currentDay] = newTitle;
    renderRoutine();
    updateSyncStatus(true);
    await dbQuery("INSERT INTO day_titles (week_id, day_index, title) VALUES (?, ?, ?) ON CONFLICT(week_id, day_index) DO UPDATE SET title = excluded.title", [currentWeekId, currentDay, newTitle]);
    updateSyncStatus(false);
  }
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

async function saveExercise() {
  const nameInput = document.getElementById('new-ex-name');
  const setsInput = document.getElementById('new-ex-sets');
  const name = nameInput.value.trim();
  const sets = setsInput.value.trim();

  if (!name) return;

  updateSyncStatus(true);
  if (editingExerciseId) {
    await dbQuery("UPDATE exercises SET name = ?, sets = ? WHERE id = ?", [name, sets, editingExerciseId]);
  } else {
    const orderIndex = currentExercises.length > 0 ? Math.max(...currentExercises.map(e => e.order_index)) + 1 : 0;
    await dbQuery("INSERT INTO exercises (week_id, day_index, name, sets, order_index) VALUES (?, ?, ?, ?, ?)", [currentWeekId, currentDay, name, sets, orderIndex]);
  }
  await loadExercises();

  closeModal();
  updateSyncStatus(false);
}

function openAddModal() {
  editingExerciseId = null;
  document.getElementById('modal-title').innerText = "Añadir Ejercicio";
  document.getElementById('new-ex-name').value = '';
  document.getElementById('new-ex-sets').value = '';
  document.getElementById('add-exercise-modal').style.display = 'flex';
}

function openEditModal(id) {
  const ex = currentExercises.find(e => e.id === id);
  if (!ex) return;
  editingExerciseId = id;
  document.getElementById('modal-title').innerText = "Editar Ejercicio";
  document.getElementById('new-ex-name').value = ex.name;
  document.getElementById('new-ex-sets').value = ex.sets;
  document.getElementById('add-exercise-modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('add-exercise-modal').style.display = 'none';
  editingExerciseId = null;
}

// Reordering Logic
function handlePointerDown(e, id, index) {
  if (e.target.closest('button') || e.target.closest('input')) return;

  const card = e.currentTarget;
  dragStartY = e.clientY;
  dragStartPageY = e.pageY;
  dragInitialRect = card.getBoundingClientRect();
  dragStartIndex = index;
  dragCurrentIndex = index;
  dragTarget = card;

  // Track initial position to cancel if scrolling
  const initialX = e.clientX;
  const initialY = e.clientY;

  const clearTimer = () => {
    clearTimeout(window.longPressTimer);
    window.removeEventListener('pointermove', handlePointerMoveCancel);
    window.removeEventListener('pointerup', clearTimer);
    window.removeEventListener('pointercancel', clearTimer);
  };

  const handlePointerMoveCancel = (moveEvent) => {
    const dist = Math.sqrt(Math.pow(moveEvent.clientX - initialX, 2) + Math.pow(moveEvent.clientY - initialY, 2));
    if (dist > 30) { // Increased threshold to 30px to be more forgiving
      clearTimer();
    }
  };

  window.addEventListener('pointermove', handlePointerMoveCancel);
  window.addEventListener('pointerup', clearTimer);
  window.addEventListener('pointercancel', clearTimer);

  window.longPressTimer = setTimeout(() => {
    window.removeEventListener('pointermove', handlePointerMoveCancel);
    window.removeEventListener('pointerup', clearTimer);
    window.removeEventListener('pointercancel', clearTimer);
    startDrag(e);
  }, 1500); // 1.5 seconds is the sweet spot for "long press"
}

function startDrag(e) {
  isDragging = true;
  dragTarget.classList.add('dragging');
  document.body.classList.add('is-dragging');
  document.documentElement.classList.add('is-dragging');

  // Disable selection
  document.body.style.userSelect = 'none';
  document.body.style.webkitUserSelect = 'none';
  document.body.style.touchAction = 'none';

  // Force-disable natural scrolling by preventing default on touchMove/pointerMove
  window.addEventListener('touchmove', preventDefault, { passive: false });
  window.addEventListener('pointermove', handlePointerMove, { passive: false });
  window.addEventListener('pointerup', handlePointerUp);
}

function preventDefault(e) {
  if (isDragging || isDayDragging) {
    if (e.cancelable) e.preventDefault();
  }
}

function handlePointerMove(e) {
  if (!isDragging) return;
  e.preventDefault();
  lastPointerEvent = e;

  // Calculate delta based on page coordinates to stay sticky during scroll
  const deltaPageY = e.pageY - dragStartPageY;

  // Use translate3d for friction-less move. 
  // We keep it relative to its original position in the flow.
  dragTarget.style.transform = `translate3d(0, ${deltaPageY}px, 0) scale(1.05)`;
  dragTarget.style.zIndex = "1000";

  checkAutoScroll(e);

  // Find potential new index by checking how many slots we are below
  const container = document.querySelector('.exercise-list');
  const cards = [...container.querySelectorAll('.exercise-card:not(.dragging)')];

  let itemsAbove = 0;
  const currentFingerY = e.clientY;

  cards.forEach((card) => {
    const rect = card.getBoundingClientRect();
    const midPoint = rect.top + rect.height / 2;
    if (currentFingerY > midPoint) {
      itemsAbove++;
    }
  });

  const newIndex = itemsAbove;

  if (newIndex !== dragCurrentIndex) {
    dragCurrentIndex = newIndex;
    updateCardsUI();
  }
}

function checkAutoScroll(e) {
  const threshold = 100; // Pixels from top/bottom to start scrolling
  const speed = 15;

  if (e.clientY < threshold) {
    if (!scrollInterval) {
      scrollInterval = setInterval(() => {
        window.scrollBy(0, -speed);
        if (lastPointerEvent) handlePointerMove(lastPointerEvent);
      }, 16);
    }
  } else if (e.clientY > window.innerHeight - threshold) {
    if (!scrollInterval) {
      scrollInterval = setInterval(() => {
        window.scrollBy(0, speed);
        // Force update of dragged item position and other items' offsets during scroll
        if (lastPointerEvent) handlePointerMove(lastPointerEvent);
      }, 16);
    }
  } else {
    stopAutoScroll();
  }
}

function stopAutoScroll() {
  if (scrollInterval) {
    clearInterval(scrollInterval);
    scrollInterval = null;
  }
}

function updateCardsUI() {
  const container = document.querySelector('.exercise-list');
  const cards = [...container.querySelectorAll('.exercise-card:not(.dragging)')];
  const dragHeight = dragTarget.offsetHeight + 12;

  cards.forEach((card) => {
    const originalIndex = parseInt(card.dataset.index);
    let offset = 0;

    if (dragCurrentIndex <= originalIndex && originalIndex < dragStartIndex) {
      // Dragging UP: items between target and start move DOWN
      offset = dragHeight;
    } else if (dragStartIndex < originalIndex && originalIndex <= dragCurrentIndex) {
      // Dragging DOWN: items between start and target move UP
      offset = -dragHeight;
    }

    card.style.transform = `translate3d(0, ${offset}px, 0)`;
  });
}

async function handlePointerUp(e) {
  clearTimeout(window.longPressTimer);
  if (!isDragging) {
    dragTarget = null;
    return;
  }

  isDragging = false;
  stopAutoScroll();
  lastPointerEvent = null;

  // Re-enable selection
  document.body.style.userSelect = '';
  document.body.style.webkitUserSelect = '';
  document.body.style.touchAction = '';

  document.body.classList.remove('is-dragging');
  document.documentElement.classList.remove('is-dragging');
  dragTarget.classList.remove('dragging');
  dragTarget.style.transform = '';
  dragTarget.style.zIndex = "";

  window.removeEventListener('touchmove', preventDefault);
  window.removeEventListener('pointermove', handlePointerMove);
  window.removeEventListener('pointerup', handlePointerUp);

  if (dragCurrentIndex !== -1 && dragCurrentIndex !== dragStartIndex) {
    // Reorder array
    const movedItem = currentExercises.splice(dragStartIndex, 1)[0];
    currentExercises.splice(dragCurrentIndex, 0, movedItem);

    // Update order_index
    currentExercises.forEach((ex, idx) => ex.order_index = idx);

    renderRoutine();
    await saveNewOrder();
  } else {
    renderRoutine();
  }

  dragTarget = null;
  dragCurrentIndex = -1;
}

async function saveNewOrder() {
  updateSyncStatus(true);
  const updates = currentExercises.map((ex, idx) => ({
    sql: "UPDATE exercises SET order_index = ? WHERE id = ?",
    args: [idx, ex.id]
  }));
  await dbBatch(updates);
  updateSyncStatus(false);
}

async function deleteExercise(id) {
  if (!confirm("¿Borrar este ejercicio?")) return;
  updateSyncStatus(true);
  await dbQuery("DELETE FROM exercises WHERE id = ?", [id]);
  await loadExercises();
  updateSyncStatus(false);
}

function renderRoutine() {
  const container = document.getElementById('routine-content');
  if (!container) return;

  const color = colorForDay(currentDay);
  const displayTitle = dayTitles[currentDay] || `Día ${currentDay}`;

  const html = `
    <div class="day-header">
      <div style="flex: 1;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
          <span class="day-tag" style="background: ${color}20; color: ${color}">DÍA ${currentDay}</span>
          <button class="edit-title-btn" onclick="window.editDayTitle()">✏️</button>
        </div>
        <h2 style="line-height: 1.2;">${displayTitle}</h2>
      </div>
    </div>
    
    <div class="exercise-list">
      ${currentExercises.map((ex, idx) => `
        <div class="exercise-card ${ex.completed ? 'completed' : ''}" 
             data-index="${idx}"
             style="border-left: 4px solid ${ex.completed ? 'transparent' : color}"
             onpointerdown="window.handlePointerDown(event, ${ex.id}, ${idx})"
             onpointerup="clearTimeout(window.longPressTimer)">
          <div class="exercise-main" onclick="window.toggleExercise(${ex.id}, ${ex.completed})">
            <div class="exercise-info">
              <span class="exercise-name">${ex.name}</span>
              <span class="exercise-sets">${ex.sets}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <button class="edit-ex-btn" title="Editar" onclick="event.stopPropagation(); window.openEditModal(${ex.id})"></button>
              <button class="delete-ex-btn" title="Borrar" onclick="event.stopPropagation(); window.deleteExercise(${ex.id})"></button>
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
      ${currentExercises.length === 0 ? '<p style="text-align:center; padding: 20px; color: var(--text-secondary)">No hay ejercicios para este día.</p>' : ''}
    </div>

    <button class="add-ex-bottom-btn" onclick="window.openAddModal()">
      <span>＋</span> Añadir Ejercicio
    </button>
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
const weekSelect = document.getElementById('week-select');
if (weekSelect) {
  weekSelect.addEventListener('change', async (e) => {
    currentWeekId = parseInt(e.target.value);
    updateSyncStatus(true);
    await loadDayTitles();
    await loadExercises();
    updateSyncStatus(false);
  });
}

const addWeekBtn = document.getElementById('add-week-btn');
if (addWeekBtn) {
  addWeekBtn.addEventListener('click', async () => {
    const name = prompt("Nombre de la nueva semana (ej: Semana 2)");
    if (name) {
      updateSyncStatus(true);
      await createWeek(name);
      updateSyncStatus(false);
    }
  });
}

async function deleteWeek() {
  if (!currentWeekId) return;
  const weekName = weeks.find(w => w.id === currentWeekId)?.name || "esta semana";
  if (!confirm(`¿Estás seguro de que quieres eliminar la "${weekName}"? Esto borrará todos sus ejercicios y datos.`)) return;

  updateSyncStatus(true);
  try {
    await dbQuery("DELETE FROM day_titles WHERE week_id = ?", [currentWeekId]);
    await dbQuery("DELETE FROM exercises WHERE week_id = ?", [currentWeekId]);
    await dbQuery("DELETE FROM weeks WHERE id = ?", [currentWeekId]);

    weeks = weeks.filter(w => w.id !== currentWeekId);

    if (weeks.length === 0) {
      currentWeekId = null;
      await createWeek("Semana 1");
    } else {
      currentWeekId = weeks[weeks.length - 1].id;
      await loadDayTitles();
      await loadExercises();
    }

    renderWeekSelector();
    renderRoutine();
  } catch (error) {
    console.error("Error al eliminar semana:", error);
  }
  updateSyncStatus(false);
}

const deleteWeekBtn = document.getElementById('delete-week-btn');
if (deleteWeekBtn) {
  deleteWeekBtn.addEventListener('click', deleteWeek);
}

const saveExBtn = document.getElementById('save-ex-btn');
if (saveExBtn) saveExBtn.addEventListener('click', saveExercise);

function renderDaySelector() {
  const container = document.querySelector('.day-selector');
  if (!container) return;

  container.innerHTML = daysOrder.map((day, idx) => `
    <button class="day-tab ${day.index === currentDay ? 'active' : ''}" 
            data-day="${day.index}"
            data-index="${idx}"
            onpointerdown="window.handleDayPointerDown(event, ${day.index}, ${idx})"
            onpointerup="clearTimeout(window.dayLongPressTimer)">
      Día ${day.index}
    </button>
  `).join('');
}

async function selectDay(dayIndex) {
  if (isDayDragging) return;
  currentDay = dayIndex;
  document.querySelectorAll('.day-tab').forEach(t => {
    t.classList.remove('active');
    if (parseInt(t.dataset.day) === dayIndex) t.classList.add('active');
  });
  updateSyncStatus(true);
  await loadExercises();
  updateSyncStatus(false);
}

// Day Reordering Logic
function handleDayPointerDown(e, dayIndex, index) {
  if (isDayDragging) return;

  const target = e.currentTarget;
  dayDragStartX = e.clientX;
  dayDragStartIndex = index;
  dayDragCurrentIndex = index;
  dayDragTarget = target;

  const initialX = e.clientX;
  const initialY = e.clientY;

  const clearDayTimer = () => {
    clearTimeout(window.dayLongPressTimer);
    window.removeEventListener('pointermove', handleDayMoveCancel);
    window.removeEventListener('pointerup', clearDayTimer);
    window.removeEventListener('pointercancel', clearDayTimer);
  };

  const handleDayMoveCancel = (moveEvent) => {
    const dist = Math.sqrt(Math.pow(moveEvent.clientX - initialX, 2) + Math.pow(moveEvent.clientY - initialY, 2));
    if (dist > 15) clearDayTimer();
  };

  window.addEventListener('pointermove', handleDayMoveCancel);
  window.addEventListener('pointerup', clearDayTimer);
  window.addEventListener('pointercancel', clearDayTimer);

  window.dayLongPressTimer = setTimeout(() => {
    clearDayTimer();
    startDayDrag(e);
  }, 800); // More responsive long press for tabs
}

function startDayDrag(e) {
  isDayDragging = true;
  dayDragTarget.classList.add('dragging');
  document.body.classList.add('is-dragging');
  document.documentElement.classList.add('is-dragging');

  // Use pointer capture to ensure we don't lose the finger/mouse even if it leaves the element
  dayDragTarget.setPointerCapture(e.pointerId);

  // Lock user selection
  document.body.style.userSelect = 'none';
  document.body.style.webkitUserSelect = 'none';
  document.body.style.touchAction = 'none';

  if (navigator.vibrate) navigator.vibrate(50);

  // Force-disable natural movement by preventing default
  window.addEventListener('touchmove', preventDefault, { passive: false });
  dayDragTarget.addEventListener('pointermove', handleDayPointerMove, { passive: false });
  dayDragTarget.addEventListener('pointerup', handleDayPointerUp);
  dayDragTarget.addEventListener('pointercancel', handleDayPointerUp); // Also handle cancel
}

function handleDayPointerMove(e) {
  if (!isDayDragging) return;
  e.preventDefault();

  const deltaX = e.clientX - dayDragStartX;
  dayDragTarget.style.transform = `translate3d(${deltaX}px, 0, 0) scale(1.1)`;
  dayDragTarget.style.zIndex = "1000";

  const container = document.querySelector('.day-selector');
  const tabs = [...container.querySelectorAll('.day-tab:not(.dragging)')];

  let itemsBefore = 0;
  const currentFingerX = e.clientX;

  tabs.forEach((tab) => {
    const rect = tab.getBoundingClientRect();
    const midPoint = rect.left + rect.width / 2;
    if (currentFingerX > midPoint) {
      itemsBefore++;
    }
  });

  const newIndex = itemsBefore;
  if (newIndex !== dayDragCurrentIndex) {
    dayDragCurrentIndex = newIndex;
    updateDaysUI();
  }
}

function updateDaysUI() {
  const container = document.querySelector('.day-selector');
  const tabs = [...container.querySelectorAll('.day-tab:not(.dragging)')];
  const dragWidth = dayDragTarget.offsetWidth + 6; // 6 is padding/gap

  tabs.forEach((tab) => {
    const originalIndex = parseInt(tab.dataset.index);
    let offset = 0;

    if (dayDragCurrentIndex <= originalIndex && originalIndex < dayDragStartIndex) {
      offset = dragWidth;
    } else if (dayDragStartIndex < originalIndex && originalIndex <= dayDragCurrentIndex) {
      offset = -dragWidth;
    }

    tab.style.transform = `translate3d(${offset}px, 0, 0)`;
  });
}

async function handleDayPointerUp(e) {
  if (!isDayDragging) {
    if (dayDragTarget && e.pointerType !== 'mouse') {
      // Handle click if it wasn't a drag (for touch devices to prevent double action)
      selectDay(parseInt(dayDragTarget.dataset.day));
    }
    return;
  }

  isDayDragging = false;
  document.body.style.touchAction = '';
  document.body.classList.remove('is-dragging');
  document.documentElement.classList.remove('is-dragging');

  dayDragTarget.classList.remove('dragging');
  dayDragTarget.style.transform = '';
  dayDragTarget.style.zIndex = "";

  window.removeEventListener('touchmove', preventDefault);
  dayDragTarget.removeEventListener('pointermove', handleDayPointerMove);
  dayDragTarget.removeEventListener('pointerup', handleDayPointerUp);
  dayDragTarget.removeEventListener('pointercancel', handleDayPointerUp);

  if (e.pointerId !== undefined) {
    dayDragTarget.releasePointerCapture(e.pointerId);
  }

  if (dayDragCurrentIndex !== -1 && dayDragCurrentIndex !== dayDragStartIndex) {
    const movedItem = daysOrder.splice(dayDragStartIndex, 1)[0];
    daysOrder.splice(dayDragCurrentIndex, 0, movedItem);

    // Update order in DB
    updateSyncStatus(true);
    const updates = daysOrder.map((day, idx) => ({
      sql: "UPDATE day_titles SET day_order = ? WHERE week_id = ? AND day_index = ?",
      args: [idx, currentWeekId, day.index]
    }));
    await dbBatch(updates);
    updateSyncStatus(false);
  }

  renderDaySelector();
  dayDragTarget = null;
}

// Re-map click listener logic to work with dynamic tabs
document.addEventListener('click', (e) => {
  const tab = e.target.closest('.day-tab');
  if (tab && !isDayDragging) {
    selectDay(parseInt(tab.dataset.day));
  }
});

window.toggleExercise = toggleExercise;
window.updateWeight = updateWeight;
window.deleteExercise = deleteExercise;
window.deleteWeek = deleteWeek;
window.editDayTitle = editDayTitle;
window.openAddModal = openAddModal;
window.openEditModal = openEditModal;
window.closeModal = closeModal;
window.handlePointerDown = handlePointerDown;
window.handleDayPointerDown = handleDayPointerDown;
window.dayLongPressTimer = dayLongPressTimer;
window.login = login;
window.logout = logout;
window.showRegister = showRegister;
window.showLoginView = () => {
  document.getElementById('register-view').style.display = 'none';
  document.getElementById('login-view').style.display = 'block';
};
window.register = register;
window.verifyCode = verifyCode;

// Init
initApp();

// PWA Logic
let deferredPrompt;
const installBtn = document.getElementById('pwa-install-btn');

// Check if app is already installed/in standalone mode
const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true ||
  document.referrer.includes('android-app://');

function showInstallButton() {
  console.log('Checking installation status:', { isStandalone });
  if (installBtn && !isStandalone) {
    installBtn.style.setProperty('display', 'inline-block', 'important');
    console.log('Showing install button');
  }
}

// Show button on load if not standalone
window.addEventListener('load', showInstallButton);
// Also try immediately
setTimeout(showInstallButton, 1000);
setTimeout(showInstallButton, 3000);

// Android / Chrome desktop logic
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('beforeinstallprompt fired');
  e.preventDefault();
  deferredPrompt = e;
  showInstallButton();
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      console.log('Triggering install prompt');
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('User choice outcome:', outcome);

      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        installBtn.style.display = 'none';
        deferredPrompt = null;
      } else {
        console.log('User dismissed the install prompt');
      }
    } else {
      // Fallback/iOS Instructions
      alert("Para instalar LuFit en tu móvil:\n\n📱 iPhone: Pulsa 'Compartir' y 'Añadir a pantalla de inicio'.\n\n🤖 Android: Pulsa los tres puntos del navegador y selecciona 'Instalar aplicación' o 'Añadir a pantalla de inicio'.");
    }
  });
}

window.addEventListener('appinstalled', () => {
  if (installBtn) installBtn.style.display = 'none';
  deferredPrompt = null;
});

// Register Service Worker with relative path
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Registering with explicit scope for subpath compatibility
    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .then(reg => {
        console.log('SW registered!', reg);
        reg.onupdatefound = () => {
          const installingWorker = reg.installing;
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New version available, please refresh.');
            }
          };
        };
      })
      .catch(err => console.log('SW registration failed:', err));
  });
}
