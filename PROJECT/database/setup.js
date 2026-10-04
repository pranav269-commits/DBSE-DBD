const fs = require('fs');
const path = require('path');
let mysql;
try {
    mysql = require('mysql2/promise');
}
catch {
    console.error('MySQL setup needs the optional package: npm install mysql2');
    process.exit(1);
}
;
function loadEnv() {
    const f = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(f))
        return;
    for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
        const s = line.trim();
        if (!s || s.startsWith('#') || !s.includes('='))
            continue;
        const i = s.indexOf('=');
        const k = s.slice(0, i).trim(), v = s.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
        if (process.env[k] === undefined)
            process.env[k] = v;
    }
}
loadEnv();
(async () => {
    const cfg = { host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', multipleStatements: true };
    const db = process.env.DB_NAME || 'dine_db';
    let c;
    try {
        c = await mysql.createConnection(cfg);
        await c.query(`CREATE DATABASE IF NOT EXISTS \`${db.replace(/`/g, '')}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await c.query(`USE \`${db.replace(/`/g, '')}\``);
        for (const file of ['schema.sql', 'seed.sql']) {
            const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
            await c.query(sql);
            console.log('Applied', file);
        }
        const adv = fs.readFileSync(path.join(__dirname, 'advanced.sql'), 'utf8').split(/^-- @statement\s*$/m).map(s => s.trim()).filter(Boolean);
        for (const stmt of adv)
            await c.query(stmt);
        console.log('Applied advanced.sql');
        console.log(`\nDine MySQL database '${db}' is ready.`);
        console.log('Set USE_MYSQL=true in .env, then run npm start.');
    }
    catch (e) {
        console.error('\nDatabase setup failed:', e.message);
        console.error('Check DB_USER / DB_PASSWORD in .env and confirm MySQL is running.');
        process.exitCode = 1;
    }
    finally {
        if (c)
            await c.end();
    }
})();
