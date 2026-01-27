import { state } from './state.js';
import { showAlert } from './features.js';

let timerState = {
    mode: 'idle', // 'rest', 'elapsed'
    endTime: null, // For REST
    startTime: null, // For ELAPSED
    duration: 60,
    pausedTime: null, // If paused, the timestamp
    timerInterval: null
};

// ==========================================
// PUBLIC API
// ==========================================

export function initTimer() {
    renderTimerUI();
    restoreTimerState();

    // Global Loop
    setInterval(updateTimerDisplay, 1000);
}

export function startRestTimer(seconds = 60) {
    // If already running rest, maybe extend? Or restart?
    // User requirement: "Al marcar una serie... debe dispararse un Timer"
    const now = Date.now();
    timerState.mode = 'rest';
    timerState.duration = seconds;
    timerState.startTime = now;
    timerState.endTime = now + (seconds * 1000);
    timerState.pausedTime = null;

    saveTimerState();
    maximizeTimer();
    updateTimerDisplay();
}

export function toggleTimer() {
    if (timerState.mode === 'idle') {
        // Default to elapsed if idle and clicked
        startElapsedTimer();
        return;
    }

    if (timerState.pausedTime) {
        // Resume
        const now = Date.now();
        const diff = now - timerState.pausedTime;

        if (timerState.mode === 'rest') {
            timerState.endTime += diff;
        } else {
            timerState.startTime += diff;
        }
        timerState.pausedTime = null;
    } else {
        // Pause
        timerState.pausedTime = Date.now();
    }
    saveTimerState();
    updateTimerDisplay();
}

export function stopTimer() {
    timerState.mode = 'idle';
    timerState.endTime = null;
    timerState.startTime = null;
    timerState.pausedTime = null;
    saveTimerState();
    updateTimerDisplay();
}

export function addTime(seconds) {
    if (timerState.mode === 'rest' && timerState.endTime) {
        timerState.endTime += (seconds * 1000);
        saveTimerState();
        updateTimerDisplay();
    }
}

export function startElapsedTimer() {
    timerState.mode = 'elapsed';
    timerState.startTime = Date.now();
    timerState.endTime = null;
    timerState.pausedTime = null;
    saveTimerState();
    maximizeTimer();
    updateTimerDisplay();
}

// ==========================================
// INTERNAL LOGIC
// ==========================================

function saveTimerState() {
    localStorage.setItem('lufit_timer', JSON.stringify(timerState));
}

function restoreTimerState() {
    const saved = localStorage.getItem('lufit_timer');
    if (saved) {
        const parsed = JSON.parse(saved);
        // Validate if expired?
        if (parsed.mode === 'rest') {
            if (Date.now() > parsed.endTime) {
                // Expired while away
                timerState.mode = 'idle';
            } else {
                timerState = parsed;
            }
        } else if (parsed.mode === 'elapsed') {
            timerState = parsed;
        }
    }
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const fab = document.getElementById('timer-fab');
    const overlay = document.getElementById('timer-overlay');
    if (!fab || !overlay) return;

    if (timerState.mode === 'idle') {
        const isOverlayActive = overlay.classList.contains('active');
        fab.style.display = isOverlayActive ? 'none' : 'flex';
        fab.style.opacity = '1';
        fab.querySelector('.fab-time').innerText = "⏱️";
        document.getElementById('timer-big-time').innerText = "00:00";
        document.getElementById('timer-toggle-btn').innerText = "▶ Empezar";
        // Ensure ring is empty
        const circle = document.querySelector('.timer-progress-ring__circle');
        if (circle) circle.style.strokeDashoffset = circle.style.strokeDasharray || 326.7;
        return;
    }

    // Hide FAB if overlay is active
    if (overlay.classList.contains('active')) {
        fab.style.display = 'none';
    } else {
        fab.style.display = 'flex';
        fab.style.opacity = '1';
    }

    // Calculate Time
    let displayTime = "00:00";
    let progress = 0;

    const now = Date.now();
    const isPaused = !!timerState.pausedTime;
    const refTime = isPaused ? timerState.pausedTime : now;

    if (timerState.mode === 'rest') {
        const remaining = Math.max(0, Math.ceil((timerState.endTime - refTime) / 1000));

        if (remaining <= 0 && !isPaused) {
            // Finished
            notifyTimerFinished();
            // Don't just stop, maybe switch to 'elapsed' to see how much extra time passed?
            // For now, let's keep it simple: stop rest and go to idle
            stopTimer();
            return;
        }

        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        displayTime = `${mins}:${secs.toString().padStart(2, '0')}`;

        document.getElementById('timer-label').innerText = "Descanso";

        const total = timerState.duration;
        progress = ((total - remaining) / total) * 100;

    } else if (timerState.mode === 'elapsed') {
        const elapsed = Math.floor((refTime - timerState.startTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        displayTime = `${mins}:${secs.toString().padStart(2, '0')}`;
        progress = 100;
        document.getElementById('timer-label').innerText = "Tiempo de Rutina";
    }

    // Update UI
    fab.querySelector('.fab-time').innerText = displayTime;
    document.getElementById('timer-big-time').innerText = displayTime;

    // Update SVG Circle
    const circle = document.querySelector('.timer-progress-ring__circle');
    const radius = circle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;
    circle.style.strokeDashoffset = offset;

    // Update Controls Text
    document.getElementById('timer-toggle-btn').innerText = isPaused ? "▶ Regresar" : "⏸ Pausar";
}

function notifyTimerFinished() {
    if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
    // Could play audio
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Simple beep
    audio.play().catch(e => console.log('Audio blocked', e));
    showAlert("¡Tiempo de descanso terminado!", "Timer");
}

// ==========================================
// UI RENDERING
// ==========================================

export function renderTimerUI() {
    if (document.getElementById('timer-fab')) return;

    const html = `
      <div id="timer-fab" class="timer-fab" onclick="window.maximizeTimer()">
         <span class="fab-time">⏱️</span>
      </div>
      
      <div id="timer-overlay" class="timer-overlay">
         <div class="timer-card">
            <div class="timer-header">
               <span id="timer-label">Entrenamiento</span>
               <button class="icon-btn" onclick="window.minimizeTimer()">✖</button>
            </div>
            
            <div class="timer-circle-container">
               <svg class="timer-progress-ring" width="160" height="160">
                 <circle class="timer-progress-ring__bg" stroke="rgba(255,255,255,0.05)" stroke-width="6" fill="transparent" r="70" cx="80" cy="80"/>
                 <circle class="timer-progress-ring__circle" stroke="var(--lu-pink)" stroke-width="6" fill="transparent" r="70" cx="80" cy="80" 
                    style="stroke-dasharray: 440; stroke-dashoffset: 440; transition: stroke-dashoffset 0.5s linear;"/>
               </svg>
               <div class="timer-time-display" id="timer-big-time">00:00</div>
            </div>

            <div class="timer-presets-grid">
               <button class="preset-btn" onclick="window.startRestTimer(60)">1m</button>
               <button class="preset-btn" onclick="window.startRestTimer(90)">1:30</button>
               <button class="preset-btn" onclick="window.startRestTimer(120)">2m</button>
               <button class="preset-btn" onclick="window.startRestTimer(180)">3m</button>
            </div>
            
            <div class="timer-main-actions">
               <button class="timer-btn tertiary" onclick="window.addTimerTime(30)">+30s</button>
               <button class="timer-btn primary-large" id="timer-toggle-btn" onclick="window.toggleTimerLogic()">▶ Iniciar</button>
               <button class="timer-btn tertiary" onclick="window.stopTimerLogic()">⏹ Reset</button>
            </div>
         </div>
      </div>
    `;

    const div = document.createElement('div');
    div.innerHTML = html;
    document.body.appendChild(div);

    // Bind Globals
    window.maximizeTimer = maximizeTimer;
    window.minimizeTimer = minimizeTimer;
    window.addTimerTime = addTime;
    window.toggleTimerLogic = toggleTimer;
    window.stopTimerLogic = stopTimer;
    window.startRestTimer = startRestTimer;
    window.startFreeTimer = startElapsedTimer;
}

function maximizeTimer() {
    const overlay = document.getElementById('timer-overlay');
    const fab = document.getElementById('timer-fab');
    if (overlay) overlay.classList.add('active');
    if (fab) fab.style.display = 'none';
    updateTimerDisplay(); // Immediate sync
}

function minimizeTimer() {
    const overlay = document.getElementById('timer-overlay');
    const fab = document.getElementById('timer-fab');
    if (overlay) overlay.classList.remove('active');
    if (fab) {
        fab.style.display = 'flex';
        fab.style.opacity = '1';
    }
}
