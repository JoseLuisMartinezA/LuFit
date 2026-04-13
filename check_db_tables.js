
import { dbQuery } from './src/db.js';
import * as dotenv from 'dotenv';
dotenv.config();

async function checkTables() {
    const res = await dbQuery("SELECT name FROM sqlite_master WHERE type='table';");
    console.log(JSON.stringify(res, null, 2));
}

checkTables();
