const DB_URL = import.meta.env.VITE_DB_URL;
const DB_TOKEN = import.meta.env.VITE_DB_TOKEN;

export async function dbBatch(requests) {
    if (!DB_URL || !DB_TOKEN) return null;
    const cleanUrl = DB_URL.replace('libsql://', 'https://') + "/v2/pipeline";

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

    try {
        const response = await fetch(cleanUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${DB_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ requests: formattedRequests })
        });
        return await response.json();
    } catch (error) {
        console.error("DB Batch Error:", error);
        return null;
    }
}

export async function dbQuery(sql, args = []) {
    const res = await dbBatch([{ sql, args }]);
    return res;
}
