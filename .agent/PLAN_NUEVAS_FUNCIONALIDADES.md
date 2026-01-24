# 📋 Plan de Implementación - Nuevas Funcionalidades LuFit

## 🎯 Objetivos Principales

### 1. **Sistema de Seguimiento de Pasos Diarios**
- ✅ Usar Web APIs para solicitar permisos de seguimiento
- ✅ Almacenar pasos diarios en base de datos
- ✅ Mostrar gráficas de progreso

### 2. **Perfil de Usuario Completo**
- ✅ Pantalla inicial de configuración (después del registro)
- ✅ Datos requeridos:
  - Peso (kg)
  - Altura (cm)
  - Edad
  - Género
  - Objetivo de pasos diarios (default: 10,000)
- ✅ Cálculo automático de IMC
- ✅ Opción de actualizar datos en cualquier momento

### 3. **Dashboard Principal**
- ✅ Vista de resumen con:
  - Pasos del día actual
  - IMC actual
  - Peso actual
  - Progreso semanal
- ✅ Gráficas visuales
- ✅ Acceso rápido a rutinas

### 4. **Sistema de Múltiples Rutinas**
- ✅ Máximo 3 rutinas por usuario
- ✅ Una rutina activa a la vez
- ✅ Vista de lista de rutinas
- ✅ Botón "Crear Nueva Rutina" (deshabilitado si ya tiene 3)

### 5. **Creación de Rutinas Personalizadas**
- ✅ Selector de número de días (3-7 días)
- ✅ Nombre personalizado para la rutina
- ✅ Rutina vacía inicial (usuario añade ejercicios)
- ✅ Opción de añadir días (hasta 7 máximo)

### 6. **Gestión de Semanas Mejorada**
- ✅ Al crear nueva semana, copiar la última semana
- ✅ Mantener todos los ejercicios y configuración
- ✅ Nombre personalizado para cada semana

### 7. **Navegación Mejorada**
- ✅ Menú hamburguesa o bottom navigation
- ✅ Secciones:
  - 🏠 Dashboard
  - 💪 Mis Rutinas
  - 👤 Perfil

## 📊 Estructura de Base de Datos

### Tablas Nuevas:

```sql
-- Perfil de usuario
CREATE TABLE user_profile (
  user_id INTEGER PRIMARY KEY,
  weight REAL,
  height REAL,
  age INTEGER,
  gender TEXT,
  daily_steps_goal INTEGER DEFAULT 10000,
  created_at TEXT
);

-- Rutinas (máximo 3 por usuario)
CREATE TABLE routines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  name TEXT,
  is_active INTEGER DEFAULT 0,
  num_days INTEGER DEFAULT 4,
  created_at TEXT
);

-- Pasos diarios
CREATE TABLE daily_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  date TEXT,
  steps INTEGER,
  created_at TEXT
);
```

### Tablas Modificadas:

```sql
-- Weeks ahora pertenece a una rutina
ALTER TABLE weeks ADD COLUMN routine_id INTEGER;

-- Day titles con orden
ALTER TABLE day_titles ADD COLUMN day_order INTEGER DEFAULT 0;
```

## 🎨 Vistas de la Aplicación

### 1. **Profile Setup Screen** (Primera vez después de registro)
```
┌─────────────────────────────────┐
│  👋 ¡Bienvenido a LuFit!        │
│                                 │
│  Completa tu perfil             │
│                                 │
│  Peso (kg): [____]              │
│  Altura (cm): [____]            │
│  Edad: [____]                   │
│  Género: [Masculino/Femenino]   │
│  Meta de pasos: [10000]         │
│                                 │
│  [Guardar y Continuar]          │
└─────────────────────────────────┘
```

### 2. **Dashboard View**
```
┌─────────────────────────────────┐
│  🏠 Dashboard                   │
│                                 │
│  ┌─────┐ ┌─────┐ ┌─────┐       │
│  │👟   │ │⚖️   │ │📊   │       │
│  │8,543│ │ 72kg│ │ IMC │       │
│  │pasos│ │     │ │24.5 │       │
│  └─────┘ └─────┘ └─────┘       │
│                                 │
│  📈 Progreso Semanal            │
│  [Gráfica de pasos]             │
│                                 │
│  💪 Rutina Activa               │
│  [Nombre de rutina]             │
│  [Ver Detalles →]               │
└─────────────────────────────────┘
```

### 3. **Routines List View**
```
┌─────────────────────────────────┐
│  💪 Mis Rutinas (2/3)           │
│                                 │
│  ┌───────────────────────────┐  │
│  │ ⭐ Rutina Fuerza          │  │
│  │ 4 días • Activa           │  │
│  │ [Ver] [Editar]            │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │ Rutina Cardio             │  │
│  │ 3 días                    │  │
│  │ [Activar] [Ver] [Eliminar]│  │
│  └───────────────────────────┘  │
│                                 │
│  [➕ Crear Nueva Rutina]        │
└─────────────────────────────────┘
```

### 4. **Create Routine Modal**
```
┌─────────────────────────────────┐
│  Crear Nueva Rutina             │
│                                 │
│  Nombre:                        │
│  [________________]             │
│                                 │
│  Número de días:                │
│  ○ 3  ○ 4  ● 5  ○ 6  ○ 7       │
│                                 │
│  [Cancelar]  [Crear Rutina]     │
└─────────────────────────────────┘
```

## 🔄 Flujo de Usuario

1. **Registro** → **Setup Perfil** → **Dashboard**
2. **Dashboard** → **Mis Rutinas** → **Seleccionar/Crear Rutina**
3. **Rutina** → **Ver Semanas** → **Ver Días** → **Ejercicios**

## 📱 Navegación

### Bottom Navigation Bar:
```
┌─────────────────────────────────┐
│  [🏠 Inicio] [💪 Rutinas] [👤]  │
└─────────────────────────────────┘
```

## ⚙️ APIs Web para Pasos

### Opciones disponibles:
1. **Generic Sensor API** (experimental)
2. **Motion Sensors** (acelerómetro)
3. **Integración manual** (usuario ingresa pasos)
4. **Google Fit / Apple Health** (requiere permisos)

**Recomendación**: Empezar con entrada manual + solicitud de permisos para sensores

## 🚀 Orden de Implementación

1. ✅ Actualizar base de datos (tablas nuevas)
2. ✅ Crear vista de Profile Setup
3. ✅ Crear Dashboard con datos del usuario
4. ✅ Implementar sistema de rutinas múltiples
5. ✅ Crear navegación entre vistas
6. ✅ Implementar creación de rutinas personalizadas
7. ✅ Añadir funcionalidad de añadir días
8. ✅ Mejorar copia de semanas
9. ✅ Integrar seguimiento de pasos (manual primero)
10. ✅ Añadir gráficas y visualizaciones

## 📝 Notas Importantes

- Mantener compatibilidad con datos existentes (migración)
- Validar límite de 3 rutinas
- Validar límite de 7 días por rutina
- Calcular IMC automáticamente: `peso / (altura/100)²`
- Guardar fecha en formato ISO para pasos diarios
- Permitir solo una rutina activa a la vez
