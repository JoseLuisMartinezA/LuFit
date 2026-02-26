
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
    console.log("Starting Backup...");

    const usersRes = await dbQuery("SELECT id, username FROM users WHERE username IN ('lucia', 'jose')");

    if (!usersRes.results || !usersRes.results[0] || usersRes.results[0].type !== 'ok') {
        console.error("Error fetching users", usersRes);
        return;
    }

    const users = usersRes.results[0].response.result.rows;
    if (users.length === 0) {
        console.log("No users 'lucia' or 'jose' found.");
        return;
    }

    let backupData = "# BACKUP LUFIT - " + new Date().toLocaleString() + "\n\n";

    for (const u of users) {
        const userId = u[0].value;
        const username = u[1].value;

        backupData += `## Usuario: ${username} (ID: ${userId})\n\n`;

        const routinesRes = await dbQuery("SELECT id, name FROM routines WHERE user_id = ?", [userId]);
        const routineRows = routinesRes.results[0].response.result.rows;

        if (!routineRows || routineRows.length === 0) {
            backupData += "_No hay rutinas_\n\n";
            continue;
        }

        for (const r of routineRows) {
            const routineId = r[0].value;
            const routineName = r[1].value;
            backupData += `### Rutina: ${routineName}\n`;

            const weeksRes = await dbQuery("SELECT id, name FROM weeks WHERE routine_id = ?", [routineId]);
            const weekRows = weeksRes.results[0].response.result.rows;
            if (!weekRows || weekRows.length === 0) {
                backupData += "_No hay semanas_\n\n";
                continue;
            }

            for (const w of weekRows) {
                const weekId = w[0].value;
                const weekName = w[1].value;
                backupData += `#### Semana: ${weekName}\n`;

                // Attempt to fetch with old columns first, then new ones if it fails?
                // Actually let's just fetch everything and handle undefined.
                const exercisesRes = await dbQuery(`SELECT * FROM exercises WHERE week_id = ?`, [weekId]);
                const exerciseRows = exercisesRes.results[0].response.result.rows;
                const cols = exercisesRes.results[0].response.result.cols.map(c => c.name);

                if (!exerciseRows || exerciseRows.length === 0) {
                    backupData += "_Sin ejercicios_\n\n";
                    continue;
                }

                backupData += "| Día | Ejercicio | Series x Repes | Peso | Estado | Sensación |\n";
                backupData += "|-----|-----------|----------------|------|--------|-----------|\n";

                for (const exRow of exerciseRows) {
                    const ex = {};
                    cols.forEach((name, i) => ex[name] = exRow[i]?.value);

                    const day = "Día " + ex.day_index;
                    const name = ex.custom_name || "ID:" + ex.exercise_library_id;
                    const sets = ex.series_target ? `${ex.series_target} x ${ex.reps_target}` : (ex.sets || "?");
                    const weight = ex.weight || "-";
                    const status = ex.completed == 1 ? "✅" : "❌";
                    const sensation = ex.sensation || "-";

                    backupData += "| " + [day, name, sets, weight, status, sensation].join(" | ") + " |\n";
                }
                backupData += "\n";
            }
        }
    }

    console.log("BACKUP_MARKER_START");
    console.log(backupData);
    console.log("BACKUP_MARKER_END");
}

backup().catch(console.error);
