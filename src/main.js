import './style.css'

const routineData = [
  {
    day: 1,
    title: "Pierna & Glúteos",
    color: "var(--accent-1)",
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
    day: 2,
    title: "Espalda & Hombros",
    color: "var(--accent-2)",
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
    day: 3,
    title: "Pierna & Glúteos (Glúteo focus)",
    color: "var(--accent-3)",
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
    day: 4,
    title: "Pecho & Brazos",
    color: "var(--accent-4)",
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

// State Management
let currentDay = 1;
const completedExercises = JSON.parse(localStorage.getItem('gymRoutineProgress')) || {};

function toggleExercise(day, exerciseName) {
  const id = `${day}-${exerciseName}`;
  completedExercises[id] = !completedExercises[id];
  localStorage.setItem('gymRoutineProgress', JSON.stringify(completedExercises));
  renderRoutine();
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
    // Update active tab
    document.querySelectorAll('.day-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Update state and render
    currentDay = parseInt(tab.dataset.day);
    renderRoutine();
  });
});

// Initial Render
renderRoutine();
