const url = "https://lufit-notorious.aws-eu-west-1.turso.io/v2/pipeline";
const token = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjkxNzc5NjAsImlkIjoiOWJiN2U1YWQtNDE0YS00NjFjLWI0MDAtNGFhNjdjN2IwOTJhIiwicmlkIjoiMTVlNTYzZDEtNzUyOC00NDAyLTkzNWMtNDdhNWMxNDc1ZmNlIn0.835Sb3eD5xjGhgx-7qvUlgAL49-aHfZi3pkYyq5B4CI9uF6kGPdmpHUMzVLKj8lqotibrR8IzgBpoG6cbCo8AA";

async function test() {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            requests: [
                { type: 'execute', stmt: { sql: 'SELECT * FROM weeks' } }
            ]
        })
    });
    console.log(JSON.stringify(await res.json(), null, 2));
}
test();
