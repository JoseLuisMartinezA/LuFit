
$filePath = "d:\Descargas\LuFit\proyecto\src\new-styles.css"
$content = Get-Content -Path $filePath

# Reemplazo de .week-actions (línea 878 aprox)
$newStyles = @"
.week-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  width: 100%;
}

.week-actions button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 4px;
  border-radius: 12px;
  cursor: pointer;
  font-family: inherit;
  font-weight: 600;
  font-size: 0.85rem;
  transition: all 0.2s ease;
  border: 1px solid var(--panel-border);
}

.week-actions .secondary-btn {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
}

.week-actions .danger-btn {
  background: rgba(255, 69, 58, 0.1);
  color: #ff453a;
  border-color: rgba(255, 69, 58, 0.2);
}

.week-actions button:hover {
  transform: translateY(-2px);
  filter: brightness(1.2);
}

.week-actions button:active {
  transform: scale(0.95);
}
"@

# Encontrar índices
$start = $content | Select-String -Pattern "^\.week-actions {" | Select-Object -First 1 | Select-Object -ExpandProperty LineNumber
$end = $content | Select-String -Pattern "^\}" -Context 0,1 | Where-Object { $_.LineNumber -gt $start } | Select-Object -First 1 | Select-Object -ExpandProperty LineNumber

# También eliminar el bloque redundante al final (línea 2341 aprox)
$start2 = $content | Select-String -Pattern "/\* Week Actions update for 3 buttons \*/" | Select-Object -First 1 | Select-Object -ExpandProperty LineNumber
$end2 = $content | Select-String -Pattern "^\}" -Context 0,1 | Where-Object { $_.LineNumber -gt $start2 } | Select-Object -Skip 1 | Select-Object -First 1 | Select-Object -ExpandProperty LineNumber

# Reconstruir contenido
$newContent = $content[0..($start-2)] + $newStyles + $content[($end)..($start2-2)] + $content[$end2..($content.Length-1)]

$newContent | Set-Content -Path $filePath -Encoding utf8
