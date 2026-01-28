-- ==============================================================================
-- LUFIT DATABASE SCHEMA V2.0 (Relational & Scalable)
-- ==============================================================================

-- 1. CLEANUP (Drop old flexible tables to ensure clean slate)
DROP TABLE IF EXISTS exercises;
DROP TABLE IF EXISTS day_titles;
DROP TABLE IF EXISTS weeks;
DROP TABLE IF EXISTS routines;
DROP TABLE IF EXISTS user_profile;
DROP TABLE IF EXISTS daily_steps;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS exercise_library; -- New table

-- 2. CORE TABLES
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT UNIQUE,
    is_verified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_profile (
    user_id INTEGER PRIMARY KEY,
    weight REAL,
    height REAL,
    age INTEGER,
    gender TEXT, -- 'male', 'female', 'other'
    daily_steps_goal INTEGER DEFAULT 10000,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- 3. THE MASTER LIBRARY (New - Static Data)
CREATE TABLE exercise_library (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    target_muscle TEXT,    -- 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio'
    equipment TEXT,        -- 'Barbell', 'Dumbbell', 'Machine', 'Bodyweight', 'Cables'
    difficulty_level TEXT, -- 'Beginner', 'Intermediate', 'Advanced'
    video_url TEXT
);

-- 4. TRAINING STRUCTURE (Hybrid: Relational Data + Weekly View)
CREATE TABLE routines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    is_active INTEGER DEFAULT 0,
    num_days INTEGER DEFAULT 4,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE weeks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    routine_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL, -- "Semana 1", "Semana 2"...
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(routine_id) REFERENCES routines(id)
);

CREATE TABLE day_titles (
    week_id INTEGER,
    day_index INTEGER, -- 1 to 7
    title TEXT,        -- "Pierna (Lunes)", "Descanso"
    day_order INTEGER DEFAULT 0,
    PRIMARY KEY(week_id, day_index),
    FOREIGN KEY(week_id) REFERENCES weeks(id)
);

-- 5. EXERCISE INSTANCES (The bridge between Plan and History)
CREATE TABLE exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_id INTEGER NOT NULL,
    day_index INTEGER NOT NULL,
    
    -- Link to Library (The "Scalable" part)
    exercise_library_id INTEGER, 
    
    -- Legacy/Custom fallback name (if not in library)
    custom_name TEXT, 
    
    -- Targets
    series_target TEXT, -- "4 x 10" (Text representation for UI)
    
    -- Actual Log Data (Numeric for analysis)
    weight REAL,          -- Kg used
    completed INTEGER DEFAULT 0,
    sensation TEXT,       -- 'excessive', 'optimal', 'light'
    
    order_index INTEGER DEFAULT 0,
    FOREIGN KEY(week_id) REFERENCES weeks(id),
    FOREIGN KEY(exercise_library_id) REFERENCES exercise_library(id)
);

-- 6. ACTIVITY TRACKING
CREATE TABLE daily_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    date TEXT, -- YYYY-MM-DD
    steps INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- SEED DATA: EXERCISE LIBRARY (~100 Common Exercises)
-- ==============================================================================

INSERT INTO exercise_library (name, target_muscle, equipment, difficulty_level) VALUES
-- CHEST
('Press de Banca (Barra)', 'Pecho', 'Barra', 'Intermedio'),
('Press de Banca (Mancuernas)', 'Pecho', 'Mancuernas', 'Intermedio'),
('Press Inclinado (Barra)', 'Pecho', 'Barra', 'Intermedio'),
('Press Inclinado (Mancuernas)', 'Pecho', 'Mancuernas', 'Intermedio'),
('Press Declinado', 'Pecho', 'Barra', 'Intermedio'),
('Aperturas con Mancuernas', 'Pecho', 'Mancuernas', 'Principiante'),
('Cruce de Poleas', 'Pecho', 'Polea', 'Intermedio'),
('Fondos en Paralelas (Dips)', 'Pecho', 'Peso Corporal', 'Avanzado'),
('Flexiones (Push-ups)', 'Pecho', 'Peso Corporal', 'Principiante'),
('Press en Máquina', 'Pecho', 'Máquina', 'Principiante'),
('Pec Deck (Contractora)', 'Pecho', 'Máquina', 'Principiante'),
('Pullover con Mancuerna', 'Pecho', 'Mancuernas', 'Intermedio'),
('Press Floor con Mancuernas', 'Pecho', 'Mancuernas', 'Intermedio'),

-- BACK
('Dominadas (Pull-ups)', 'Espalda', 'Peso Corporal', 'Avanzado'),
('Dominadas Asistidas', 'Espalda', 'Máquina', 'Principiante'),
('Jalón al Pecho (Lat Pulldown)', 'Espalda', 'Polea', 'Principiante'),
('Remo con Barra', 'Espalda', 'Barra', 'Avanzado'),
('Remo con Mancuerna', 'Espalda', 'Mancuernas', 'Intermedio'),
('Remo en Polea Baja (Gironda)', 'Espalda', 'Polea', 'Intermedio'),
('Remo en Máquina', 'Espalda', 'Máquina', 'Principiante'),
('Peso Muerto Convencional', 'Espalda', 'Barra', 'Avanzado'),
('Peso Muerto Sumo', 'Espalda', 'Barra', 'Avanzado'),
('Hiperextensiones', 'Espalda', 'Banco', 'Principiante'),
('Face Pull', 'Hombros', 'Polea', 'Principiante'),
('Pull Over en Polea Alta', 'Espalda', 'Polea', 'Intermedio'),
('Remo Meadows', 'Espalda', 'Barra', 'Avanzado'),
('Remo Pendlay', 'Espalda', 'Barra', 'Avanzado'),

-- LEGS (QUADS, HAMSTRINGS, GLUTES)
('Sentadilla (Barra Trasera)', 'Pierna', 'Barra', 'Avanzado'),
('Sentadilla Frontal', 'Pierna', 'Barra', 'Avanzado'),
('Sentadilla Goblet', 'Pierna', 'Mancuernas', 'Principiante'),
('Prensa de Piernas', 'Pierna', 'Máquina', 'Principiante'),
('Sentadilla Hack', 'Pierna', 'Máquina', 'Intermedio'),
('Extensiones de Cuádriceps', 'Pierna', 'Máquina', 'Principiante'),
('Zancadas (Lunges)', 'Pierna', 'Mancuernas', 'Intermedio'),
('Zancadas Búlgaras', 'Pierna', 'Mancuernas', 'Intermedio'),
('Peso Muerto Rumano', 'Pierna', 'Barra', 'Intermedio'),
('Peso Muerto Rumano (Mancuernas)', 'Pierna', 'Mancuernas', 'Intermedio'),
('Curl Femoral Tumbado', 'Pierna', 'Máquina', 'Principiante'),
('Curl Femoral Sentado', 'Pierna', 'Máquina', 'Principiante'),
('Hip Thrust (Barra)', 'Glúteos', 'Barra', 'Intermedio'),
('Hip Thrust (Máquina)', 'Glúteos', 'Máquina', 'Intermedio'),
('Patada de Glúteo en Polea', 'Glúteos', 'Polea', 'Intermedio'),
('Abductores en Máquina', 'Glúteos', 'Máquina', 'Principiante'),
('Gemelos de Pie', 'Pierna', 'Máquina', 'Principiante'),
('Gemelos Sentado', 'Pierna', 'Máquina', 'Principiante'),
('Step-Up al Banco', 'Pierna', 'Banco', 'Intermedio'),

-- SHOULDERS
('Press Militar (Barra de Pie)', 'Hombros', 'Barra', 'Avanzado'),
('Press de Hombros (Mancuernas)', 'Hombros', 'Mancuernas', 'Intermedio'),
('Press Arnold', 'Hombros', 'Mancuernas', 'Intermedio'),
('Elevaciones Laterales', 'Hombros', 'Mancuernas', 'Principiante'),
('Elevaciones Frontales', 'Hombros', 'Mancuernas', 'Principiante'),
('Pájaros (Elevaciones Posteriores)', 'Hombros', 'Mancuernas', 'Intermedio'),
('Remo al Mentón', 'Hombros', 'Barra', 'Intermedio'),
('Elevaciones Laterales Polea', 'Hombros', 'Polea', 'Intermedio'),
('Press Hombros Máquina', 'Hombros', 'Máquina', 'Principiante'),

-- ARMS (BICEPS/TRICEPS)
('Curl de Bíceps con Barra', 'Bíceps', 'Barra', 'Principiante'),
('Curl con Mancuernas', 'Bíceps', 'Mancuernas', 'Principiante'),
('Curl Martillo', 'Bíceps', 'Mancuernas', 'Principiante'),
('Curl Predicador (Scott)', 'Bíceps', 'Barra Z', 'Intermedio'),
('Curl Concentrado', 'Bíceps', 'Mancuernas', 'Intermedio'),
('Curl en Polea', 'Bíceps', 'Polea', 'Principiante'),
('Curl Araña (Spider)', 'Bíceps', 'Mancuernas', 'Intermedio'),
('Extensiones de Tríceps en Polea', 'Tríceps', 'Polea', 'Principiante'),
('Press Francés', 'Tríceps', 'Barra Z', 'Intermedio'),
('Rompecráneos', 'Tríceps', 'Barra', 'Intermedio'),
('Patada de Tríceps', 'Tríceps', 'Mancuernas', 'Intermedio'),
('Fondos entre Bancos', 'Tríceps', 'Peso Corporal', 'Principiante'),
('Extensión Tríceps Copa', 'Tríceps', 'Mancuernas', 'Intermedio'),
('Extensiones Tríceps sobre Cabeza', 'Tríceps', 'Polea', 'Intermedio'),

-- CORE
('Plancha Abdominal (Plank)', 'Core', 'Peso Corporal', 'Principiante'),
('Crunch Abdominal', 'Core', 'Peso Corporal', 'Principiante'),
('Elevación de Piernas', 'Core', 'Barra', 'Intermedio'),
('Rueda Abdominal', 'Core', 'Accesorio', 'Avanzado'),
('Russian Twist', 'Core', 'Mancuernas', 'Intermedio'),
('Leñador (Woodchopper)', 'Core', 'Polea', 'Intermedio'),
('V-Ups', 'Core', 'Peso Corporal', 'Avanzado'),
('Sit-ups', 'Core', 'Peso Corporal', 'Principiante'),

-- OLYMPIC / CROSSFIT / CARDIO
('Clean & Jerk', 'Full Body', 'Barra', 'Avanzado'),
('Snatch', 'Full Body', 'Barra', 'Avanzado'),
('Burpees', 'Cardio', 'Peso Corporal', 'Intermedio'),
('Box Jumps', 'Pierna', 'Cajón', 'Intermedio'),
('Kettlebell Swing', 'Full Body', 'Kettlebell', 'Intermedio'),
('Salto a la Comba', 'Cardio', 'Cuerda', 'Principiante'),
('Remo Concept2 (Cardio)', 'Cardio', 'Máquina', 'Principiante'),
('Battle Ropes', 'Cardio', 'Cuerdas', 'Intermedio'),
('Wall Balls', 'Full Body', 'Balón Medicinal', 'Intermedio');
