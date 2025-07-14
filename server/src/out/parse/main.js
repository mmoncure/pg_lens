#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = parse;
const parser = require("libpg-query");
const fs = require("fs");
const pg_1 = require("pg");
const dotenv = require("dotenv");
const yargs_1 = require("yargs");
const path = require("path");
const argv = (0, yargs_1.default)(process.argv.slice(2)).options({
    i: { type: 'string', demandOption: true },
    o: { type: 'string' },
    rw: { type: 'string', choices: ['db', 'stdout'], demandOption: true },
    d: { type: 'boolean', default: false }
}).parseSync();
dotenv.config({ path: "/Users/maxim.jovanovic/Desktop/testlsp/.env" });
// pg setup
// console.log(process.env.PG_USER)
const client = new pg_1.Client({
    user: process.env.PG_USER,
    password: process.env.PG_PASS,
    host: process.env.PG_HOST,
    port: 5432,
    database: process.env.DB_NAME,
});
async function parse(docPath, outPath, debug, outType) {
    fs.writeFileSync('../stdout/dog.json', "SHIT");
    var sampleSQLtest = fs.readFileSync(docPath).toString();
    const splitSQL = await lintPSQL(sampleSQLtest);
    const stmts = await createStatements(splitSQL.sql, splitSQL.psql);
    if (outType === "stdout") {
        fs.writeFileSync(path.join('./stdout', outPath || "./dog.json"), JSON.stringify(stmts, null, 2));
        process.stdout.write(`OUT: \n${JSON.stringify(stmts, null, 2)}`);
        process.exit(1);
    }
    else {
        // do sql actions here
        process.exit(1);
    }
}
async function lintPSQL(document) {
    if (argv.d)
        process.stdout.write(`DEBUG: Parsing out \\ statements\n`);
    const backslashLines = document.match(/^\\.*$/gm) || [];
    if (argv.d)
        process.stdout.write(`DEBUG: Regexifying document\n`);
    const cleaned = document.replace(/^\\.*$/gm, '').replace(/^\s*[\r\n]/gm, '');
    return ({ sql: cleaned, psql: backslashLines });
}
async function createStatements(lintedDocument, psql) {
    const statements = [];
    let currentStatement = '';
    let insideSingleQuote = false;
    let previousChar = '';
    let statementStartIndex = 0;
    if (argv.d)
        process.stdout.write(`DEBUG: Starting splitter\n`);
    for (let i = 0; i < lintedDocument.length; i++) {
        const char = lintedDocument[i];
        if (char === "'" && previousChar !== '\\') {
            insideSingleQuote = !insideSingleQuote;
        }
        if (!insideSingleQuote && char === ';') {
            const trimmedStatement = currentStatement.trim();
            const startOffset = lintedDocument.indexOf(trimmedStatement, statementStartIndex);
            const stmtLen = trimmedStatement.length;
            if (argv.d)
                process.stdout.write(`DEBUG: Statement found! Adding\n`);
            try {
                let parsified = await parser.parseQuery(trimmedStatement);
                if (parsified.stmts === undefined) {
                    throw new Error("something very weird happened");
                }
                let stmtobj = {
                    stmt: parsified.stmts[0].stmt,
                    stmt_len: stmtLen,
                    stmt_location: startOffset,
                    error: false,
                    reason: undefined,
                };
                statements.push(stmtobj);
            }
            catch (e) {
                if (argv.d)
                    process.stdout.write(`ERROR: ${e}\n`);
                let stmtobj = {
                    stmt: undefined,
                    stmt_len: stmtLen,
                    stmt_location: startOffset,
                    error: true,
                    reason: e.toString(),
                };
                statements.push(stmtobj);
            }
            statementStartIndex = i + 1;
            currentStatement = '';
        }
        else {
            currentStatement += char;
        }
        previousChar = char;
    }
    if (currentStatement.trim().length > 0) {
        const trimmedStatement = currentStatement.trim();
        const startOffset = lintedDocument.indexOf(trimmedStatement, statementStartIndex);
        const stmtLen = trimmedStatement.length;
        if (argv.d)
            process.stdout.write(`DEBUG: Statement found! Adding\n`);
        try {
            let parsified = await parser.parseQuery(trimmedStatement);
            if (parsified.stmts === undefined) {
                throw new Error("something very weird happened");
            }
            let stmtobj = {
                stmt: parsified.stmts[0].stmt,
                stmt_len: stmtLen,
                stmt_location: startOffset,
                error: false,
                reason: undefined,
            };
            statements.push(stmtobj);
        }
        catch (e) {
            if (argv.d)
                process.stdout.write(`ERROR: ${e}\n`);
            let stmtobj = {
                stmt: undefined,
                stmt_len: stmtLen,
                stmt_location: startOffset,
                error: true,
                reason: e.toString(),
            };
            statements.push(stmtobj);
        }
    }
    return {
        statements: statements,
        psql: psql
    };
}
// testing 
// (async () => {
// 	// console.log(argv.i)
// 	// console.log(argv.o)
// 	// console.log(argv.rw)
// 	// console.log(argv.d)
// 	if (argv.rw === "db") {
// 		await client.connect()
// 		if (argv.d) process.stdout.write(`DEBUG: Connected to database ${process.env.PG_HOST}:${process.env.PG_PORT}\n`)
// 		await parse(argv.i, argv.o, argv.d, argv.rw)
// 	}
// 	else {
// 		await parse(argv.i, argv.o, argv.d, argv.rw)
// 	}
// })()
//# sourceMappingURL=main.js.map