import { dbQuery } from './src/db.js';

async function checkData() {
    try {
        const uRes = await dbQuery("SELECT id, username FROM users", []);
        console.log("USERS:", JSON.stringify(uRes.results[0].response.result.rows, null, 2));

        const rRes = await dbQuery("SELECT id, user_id, name FROM routines", []);
        console.log("ROUTINES:", JSON.stringify(rRes.results[0].response.result.rows, null, 2));

        const wRes = await dbQuery("SELECT id, routine_id, name FROM weeks", []);
        console.log("WEEKS:", JSON.stringify(wRes.results[0].response.result.rows, null, 2));

        const eRes = await dbQuery("SELECT id, week_id, day_index, custom_name, series_target FROM exercises", []);
        console.log("EXERCISES (First 5):", JSON.stringify(eRes.results[0].response.result.rows.slice(0, 5), null, 2));
        console.log("EXERCISES TOTAL:", eRes.results[0].response.result.rows.length);

    } catch (err) {
        console.error("Error checking data", err);
    }
}

checkData();
