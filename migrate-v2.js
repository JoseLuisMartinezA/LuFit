const DB_URL = "https://lufit-notorious.aws-eu-west-1.turso.io/v2/pipeline";
const DB_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjkxNzc5NjAsImlkIjoiOWJiN2U1YWQtNDE0YS00NjFjLWI0MDAtNGFhNjdjN2IwOTJhIiwicmlkIjoiMTVlNTYzZDEtNzUyOC00NDAyLTkzNWMtNDdhNWMxNDc1ZmNlIn0.835Sb3eD5xjGhgx-7qvUlgAL49-aHfZi3pkYyq5B4CI9uF6kGPdmpHUMzVLKj8lqotibrR8IzgBpoG6cbCo8AA";

async function run() {
    try {
        console.log("Iniciando migración...");
        const response = await fetch(DB_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${DB_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                requests: [
                    { type: 'execute', stmt: { sql: 'CREATE TABLE IF NOT EXISTS weeks (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)' } },
                    { type: 'execute', stmt: { sql: 'CREATE TABLE IF NOT EXISTS exercises (id INTEGER PRIMARY KEY AUTOINCREMENT, week_id INTEGER, day_index INTEGER, name TEXT, sets TEXT, completed INTEGER DEFAULT 0, weight TEXT DEFAULT \'\', FOREIGN KEY(week_id) REFERENCES weeks(id))' } }
                ]
            })
        });

        const data = await response.json();
        console.log("Migración completada:", JSON.stringify(data, null, 2));

        // Verificar si hay semanas, si no, crear la primera
        const checkWeeks = await fetch(DB_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${DB_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                requests: [{ type: 'execute', stmt: { sql: 'SELECT COUNT(*) as count FROM weeks' } }]
            })
        });
        const weeksData = await checkWeeks.json();
        const count = weeksData.results[0].response.result.rows[0][0].value;

        if (count === 0) {
            console.log("Creando Semana 1 inicial...");
            await fetch(DB_URL, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${DB_TOKEN}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requests: [
                        { type: 'execute', stmt: { sql: 'INSERT INTO weeks (name) VALUES (?)', args: [{ type: 'text', value: 'Semana 1' }] } }
                    ]
                })
            });
            console.log("Semana 1 creada.");
        }
    } catch (e) {
        console.error("Error en migración:", e);
    }
}

run();
