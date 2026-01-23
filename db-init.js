const url = "https://lufit-notorious.aws-eu-west-1.turso.io/v2/pipeline";
const token = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjkxNzcyNjQsImlkIjoiOWJiN2U1YWQtNDE0YS00NjFjLWI0MDAtNGFhNjdjN2IwOTJhIiwicmlkIjoiMTVlNTYzZDEtNzUyOC00NDAyLTkzNWMtNDdhNWMxNDc1ZmNlIn0.3_HXFTYeIiapctQU2JLV2aGNXtRcHfjCso1xiPakRQxzoDQArJyQZTUOPmTIkmmWlzS0c7Jdo7EvGYSV3OFcBQ";

async function init() {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            requests: [
                { type: 'execute', stmt: { sql: 'CREATE TABLE IF NOT EXISTS progress (user_id TEXT, exercise_key TEXT, completed INTEGER, PRIMARY KEY (user_id, exercise_key))' } }
            ]
        })
    });
    console.log(await res.json());
}
init();
