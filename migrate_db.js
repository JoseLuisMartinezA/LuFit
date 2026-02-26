
const DB_URL = "https://lufit-notorious.aws-eu-west-1.turso.io";
const DB_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjkxNzc5NjAsImlkIjoiOWJiN2U1YWQtNDE0YS00NjFjLWI0MDAtNGFhNjdjN2IwOTJhIiwicmlkIjoiMTVlNTYzZDEtNzUyOC00NDAyLTkzNWMtNDdhNWMxNDc1ZmNlIn0.835Sb3eD5xjGhgx-7qvUlgAL49-aHfZi3pkYyq5B4CI9uF6kGPdmpHUMzVLKj8lqotibrR8IzgBpoG6cbCo8AA";

async function runMigration() {
    console.log("Starting Migration...");

    const requests = [
        { type: 'execute', stmt: { sql: "ALTER TABLE exercises ADD COLUMN reps_target TEXT;", args: [] } },
        { type: 'execute', stmt: { sql: "ALTER TABLE exercises ADD COLUMN unit TEXT DEFAULT 'kg';", args: [] } },
        { type: 'execute', stmt: { sql: "ALTER TABLE user_profile ADD COLUMN preferred_unit TEXT DEFAULT 'kg';", args: [] } },
        { type: 'execute', stmt: { sql: "CREATE TABLE IF NOT EXISTS weight_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, weight REAL, date TEXT, unit TEXT, FOREIGN KEY(user_id) REFERENCES users(id));", args: [] } }
    ];

    const response = await fetch(DB_URL + "/v2/pipeline", {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${DB_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests })
    });
    const res = await response.json();
    console.log("Migration Result:", JSON.stringify(res, null, 2));
}

runMigration().catch(console.error);
