
const DB_URL = "https://lufit-notorious.aws-eu-west-1.turso.io";
const DB_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjkxNzc5NjAsImlkIjoiOWJiN2U1YWQtNDE0YS00NjFjLWI0MDAtNGFhNjdjN2IwOTJhIiwicmlkIjoiMTVlNTYzZDEtNzUyOC00NDAyLTkzNWMtNDdhNWMxNDc1ZmNlIn0.835Sb3eD5xjGhgx-7qvUlgAL49-aHfZi3pkYyq5B4CI9uF6kGPdmpHUMzVLKj8lqotibrR8IzgBpoG6cbCo8AA";

async function dbBatch(requests) {
    const cleanUrl = DB_URL + "/v2/pipeline";
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

    const response = await fetch(cleanUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${DB_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: formattedRequests })
    });
    return await response.json();
}

async function dbQuery(sql, args = []) {
    return await dbBatch([{ sql, args }]);
}

async function backup() {
    console.log("Starting Debug Backup...");

    const usersRes = await dbQuery("SELECT id, username FROM users WHERE username IN ('lucia', 'jose')");
    console.log("Users Response:", JSON.stringify(usersRes, null, 2));

    const users = usersRes.results[0].response.result.rows;
    for (const u of users) {
        const userId = u[0].value;
        const routinesRes = await dbQuery("SELECT id, name FROM routines WHERE user_id = ?", [userId]);
        console.log(`Routines for ${u[1].value}:`, JSON.stringify(routinesRes, null, 2));
    }
}

backup().catch(console.error);
