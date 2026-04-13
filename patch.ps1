
$filePath = "d:\Descargas\LuFit\proyecto\src\features.js"
$content = Get-Content -Path $filePath

# Reemplazo de renderWeekSelector (líneas 1075 a 1085 aprox)
$start = 1075
$end = 1085
$newFunc = @"
export function renderWeekSelector() {
  const select = document.getElementById('week-select');
  if (select) {
    select.style.display = 'none';
    let container = document.getElementById('custom-week-selector');
    if (!container) {
      container = document.createElement('div');
      container.id = 'custom-week-selector';
      container.className = 'custom-week-list fade-in';
      select.parentNode.insertBefore(container, select);
    }

    container.innerHTML = state.weeks.map(w => {
      const date = w.createdAt ? new Date(w.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '';
      return \`
        <div class="week-chip \${w.id == state.currentWeekId ? 'active' : ''}" onclick="window.switchWeek(\${w.id})">
          <span class="week-chip-name">\${w.name}</span>
          \${date ? \`<span class="week-chip-date">\${date}</span>\` : ''}
        </div>
      \`;
    }).join('');
  }
}

export async function switchWeek(weekId) {
  state.currentWeekId = weekId;
  updateSyncStatus(true);
  await loadDayTitles();
  await loadExercises();
  renderDaySelector();
  renderWeekSelector();
  updateSyncStatus(false);
}
"@

# Reemplazo de exportación final (líneas finales - buscando por patrón)
$exportLine = $content | Select-String -Pattern "toggleExerciseExpand, toggleSetStatus" | Select-Object -ExpandProperty LineNumber

$newContent = $content[0..($start-2)] + $newFunc + $content[$end..($exportLine-2)] + "      toggleExerciseExpand, toggleSetStatus, switchWeek" + $content[$exportLine..($content.Length-1)]

$newContent | Set-Content -Path $filePath -Encoding utf8
