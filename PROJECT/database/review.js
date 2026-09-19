const fs = require('fs');
const path = require('path');

function printHelp() {
  console.log(`
Dine Database Review
--------------------
Read-only MySQL schema inspection for project/database review.

Usage:
  npm run db:review
  npm run db:review -- --table orders

Before running:
  1. Create .env from .env.example
  2. Install mysql2 once: npm install mysql2
  3. Run: npm run db:setup

The review command prints tables, exact row counts, columns, primary/index keys,
and foreign-key relationships. It does not modify database records.
`);
}

function loadEnv() {
  const file = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(file)) return;

  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const value = line.trim();
    if (!value || value.startsWith('#') || !value.includes('=')) continue;
    const index = value.indexOf('=');
    const key = value.slice(0, index).trim();
    const raw = value.slice(index + 1).trim().replace(/^['"]|['"]$/g, '');
    if (process.env[key] === undefined) process.env[key] = raw;
  }
}

function requestedTable(args) {
  const index = args.indexOf('--table');
  return index >= 0 ? String(args[index + 1] || '').trim() : '';
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  loadEnv();

  let mysql;
  try {
    mysql = require('mysql2/promise');
  } catch {
    console.error('Database review needs the optional mysql2 package. Run: npm install mysql2');
    process.exitCode = 1;
    return;
  }

  const database = process.env.DB_NAME || 'dine_db';
  const config = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database
  };

  const filter = requestedTable(args);
  let connection;

  try {
    connection = await mysql.createConnection(config);

    const [tables] = await connection.query(
      `SELECT TABLE_NAME tableName
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
       ORDER BY TABLE_NAME`,
      [database]
    );

    let names = tables.map((row) => row.tableName);
    if (filter) {
      if (!names.includes(filter)) {
        throw new Error(`Table '${filter}' does not exist in ${database}.`);
      }
      names = [filter];
    }

    console.log(`\nDINE DATABASE REVIEW — ${database}`);
    console.log('='.repeat(72));
    console.log(`Tables found: ${tables.length}${filter ? ` | Showing: ${filter}` : ''}\n`);

    for (const tableName of names) {
      const safeTable = tableName.replace(/`/g, '');
      const [[count]] = await connection.query(`SELECT COUNT(*) rowCount FROM \`${safeTable}\``);
      const [columns] = await connection.query(
        `SELECT COLUMN_NAME columnName,
                COLUMN_TYPE columnType,
                IS_NULLABLE isNullable,
                COLUMN_KEY columnKey,
                EXTRA extra
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
         ORDER BY ORDINAL_POSITION`,
        [database, tableName]
      );
      const [foreignKeys] = await connection.query(
        `SELECT COLUMN_NAME columnName,
                REFERENCED_TABLE_NAME referencedTable,
                REFERENCED_COLUMN_NAME referencedColumn
         FROM information_schema.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = ?
           AND TABLE_NAME = ?
           AND REFERENCED_TABLE_NAME IS NOT NULL
         ORDER BY ORDINAL_POSITION`,
        [database, tableName]
      );

      const fkMap = new Map(
        foreignKeys.map((fk) => [
          fk.columnName,
          `${fk.referencedTable}.${fk.referencedColumn}`
        ])
      );

      console.log(`TABLE: ${tableName}  |  ROWS: ${Number(count.rowCount)}`);
      console.log('-'.repeat(72));
      console.log('COLUMN'.padEnd(27) + 'TYPE'.padEnd(25) + 'KEY / RELATION');

      for (const column of columns) {
        const keys = [];
        if (column.columnKey === 'PRI') keys.push('PK');
        else if (column.columnKey === 'UNI') keys.push('UNIQUE');
        else if (column.columnKey === 'MUL') keys.push('INDEX');
        if (fkMap.has(column.columnName)) keys.push(`FK -> ${fkMap.get(column.columnName)}`);
        if (String(column.extra || '').includes('auto_increment')) keys.push('AUTO_INCREMENT');

        console.log(
          String(column.columnName).padEnd(27) +
          String(column.columnType).padEnd(25) +
          (keys.join(', ') || (column.isNullable === 'NO' ? 'NOT NULL' : ''))
        );
      }

      console.log('');
    }
  } catch (error) {
    console.error(`Database review failed: ${error.message}`);
    console.error('Confirm MySQL is running and .env contains the correct DB credentials.');
    process.exitCode = 1;
  } finally {
    if (connection) await connection.end();
  }
}

main();
