
import fs from 'fs';
import path from 'path';

const filesToFix = [
  'index.html',
  'src/features.js',
  'src/ai_planner.js',
  'src/timer.js',
  'src/db.js',
  'src/state.js'
];

const patterns = [
  { from: /Ultra-EstratÃ©gico/g, to: 'Ultra-Estratégico' },
  { from: /Ultra-Estrat\?\?gico/g, to: 'Ultra-Estratégico' },
  { from: /Estrat\?\?gico/g, to: 'Estratégico' },
  { from: /T\?\?tulos/g, to: 'Títulos' },
  { from: /TÃ­tulos/g, to: 'Títulos' },
  { from: /D\?\?a/g, to: 'Día' },
  { from: /M\?\?quina/g, to: 'Máquina' },
  { from: /Gl\?\?teos/g, to: 'Glúteos' },
  { from: /B\?\?ceps/g, to: 'Bíceps' },
  { from: /Tr\?\?ceps/g, to: 'Tríceps' },
  { from: /Cu\?\?driceps/g, to: 'Cuádriceps' },
  { from: /P\?\?jaros/g, to: 'Pájaros' },
  { from: /A\?\?adir/g, to: 'Añadir' },
  { from: /Ment\?\?n/g, to: 'Mentón' },
  { from: /Franc\?\?s/g, to: 'Francés' },
  { from: /Elevaci\?\?n/g, to: 'Elevación' },
  { from: /Tracci\?\?n/g, to: 'Tracción' },
  { from: /L\?\?mite/g, to: 'Límite' },
  { from: /Sesi\?\?n/g, to: 'Sesión' },
  { from: /D\?\?as/g, to: 'Días' },
  { from: /Rut\?\?nas/g, to: 'Rutinas' },
  { from: /opci\?\?n/g, to: 'opción' },
  { from: /configuraci\?\?n/g, to: 'configuración' },
  { from: /Ã¡/g, to: 'á' },
  { from: /Ã©/g, to: 'é' },
  { from: /Ã­/g, to: 'í' },
  { from: /Ã³/g, to: 'ó' },
  { from: /Ãº/g, to: 'ú' },
  { from: /Ã±/g, to: 'ñ' },
  { from: /Ã /g, to: 'Á' },
  { from: /Ã‰/g, to: 'É' },
  { from: /Ãš/g, to: 'Ú' },
  { from: /Ã‘/g, to: 'Ñ' },
  { from: /BÃ­ceps/g, to: 'Bíceps' },
  { from: /TrÃ­ceps/g, to: 'Tríceps' },
  { from: /GlÃºteos/g, to: 'Glúteos' },
  { from: /DÃ­a/g, to: 'Día' },
  { from: /AnalizarÃ©/g, to: 'Analizaré' },
  { from: /crearÃ©/g, to: 'crearé' },
  { from: /Ã—/g, to: '×' },
  { from: /\?\?/g, to: '?' } // Last resort
];



filesToFix.forEach(file => {
  const fullPath = path.resolve(file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    patterns.forEach(p => {
      content = content.replace(p.from, p.to);
    });
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Fixed: ${file}`);
  }
});
