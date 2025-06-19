#!/usr/bin/env node
import * as parser from 'libpg-query'
import * as types from '../types'
import { create } from 'domain';
import { inspect } from 'util'
import * as fs from 'fs'
import { Client } from 'pg'
import * as dotenv from 'dotenv'
import yargs, { boolean } from 'yargs'
import path from 'path'

const argv = yargs(process.argv.slice(2)).options({
  i: { type: 'string', demandOption: true },
  o: { type: 'string' },
  rw: { type: 'string', choices: ['db', 'stdout'], demandOption: true },
  d: { type: 'boolean', default: false}
}).parseSync();


dotenv.config({ path: "/Users/maxim.jovanovic/Desktop/testlsp/.env"});

// pg setup

// console.log(process.env.PG_USER)

const client = new Client({
  user: process.env.PG_USER,
  password: process.env.PG_PASS,
  host: process.env.PG_HOST,
  port: 5432,
  database: process.env.DB_NAME,
})


async function parse(docPath: string, outPath: string | undefined, debug: boolean, outType: string) {
	var sampleSQLtest = fs.readFileSync(docPath).toString()

	const splitSQL: types.pAndSql = await lintPSQL(sampleSQLtest);
	const stmts = await createStatements(splitSQL.sql,splitSQL.psql)
 
	if (outType === "stdout") {
		fs.writeFileSync(path.join('./out', outPath || "./dog.json"), JSON.stringify(stmts,null,2))
		process.stdout.write(`\n\nOUT: \n${JSON.stringify(stmts,null,2)}`)
		process.exit(1)
	}
	else {
		// do sql actions here
		process.exit(1)
	}
}

async function lintPSQL(document: string): Promise<types.pAndSql> { 
	if (argv.d) process.stdout.write(`DEBUG: Parsing out \\ statements\n`)
	const backslashLines: string[] = document.match(/^\\.*$/gm) || [];
	if (argv.d) process.stdout.write(`DEBUG: Regexifying document\n`)
	const cleaned = document.replace(/^\\.*$/gm, '').replace(/^\s*[\r\n]/gm, '');
	return ({sql: cleaned, psql: backslashLines})
}

async function createStatements(lintedDocument: string, psql: string[]): Promise<types.stmtArr> {
const statements: types.stmtObj[] = [];
let currentStatement = '';
let insideSingleQuote = false;
let previousChar = '';
let statementStartIndex = 0;

if (argv.d) process.stdout.write(`DEBUG: Starting splitter\n`)
for (let i = 0; i < lintedDocument.length; i++) {
    const char = lintedDocument[i];

    if (char === "'" && previousChar !== '\\') {
        insideSingleQuote = !insideSingleQuote;
    }

    if (!insideSingleQuote && char === ';') {
        const trimmedStatement = currentStatement.trim();
        const startOffset = lintedDocument.indexOf(trimmedStatement, statementStartIndex);
        const stmtLen = trimmedStatement.length;
		if (argv.d) process.stdout.write(`DEBUG: Statement found! Adding\n`)
        try {
            let parsified = await parser.parseQuery(trimmedStatement);
            if (parsified.stmts === undefined) {
                throw new Error("something very weird happened");
            }

            let stmtobj: types.stmtObj = {
                stmt: parsified.stmts[0].stmt,
                stmt_len: stmtLen,
                stmt_location: startOffset,
                error: false,
                reason: undefined,
            };
            statements.push(stmtobj);
			} catch (e: any) {
				if (argv.d) process.stdout.write(`ERROR: ${e}\n`)
				let stmtobj: types.stmtObj = {
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
		} else {
			currentStatement += char;
		}

		previousChar = char;
	}

	if (currentStatement.trim().length > 0) {
		const trimmedStatement = currentStatement.trim();
		const startOffset = lintedDocument.indexOf(trimmedStatement, statementStartIndex);
		const stmtLen = trimmedStatement.length;
		if (argv.d) process.stdout.write(`DEBUG: Statement found! Adding\n`)
		try {
			let parsified = await parser.parseQuery(trimmedStatement);
			if (parsified.stmts === undefined) {
				throw new Error("something very weird happened");
			}

			let stmtobj: types.stmtObj = {
				stmt: parsified.stmts[0].stmt,
				stmt_len: stmtLen,
				stmt_location: startOffset,
				error: false,
				reason: undefined,
			};
			statements.push(stmtobj);
		} catch (e: any) {
			if (argv.d) process.stdout.write(`ERROR: ${e}\n`)
			let stmtobj: types.stmtObj = {
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
(async () => {
	// console.log(argv.i)
	// console.log(argv.o)
	// console.log(argv.rw)
	// console.log(argv.d)
	if (argv.rw === "db") {
		await client.connect()
		if (argv.d) process.stdout.write(`DEBUG: Connected to database ${process.env.PG_HOST}:${process.env.PG_PORT}\n`)
		await parse(argv.i, argv.o, argv.d, argv.rw)
	}
	else {
		await parse(argv.i, argv.o, argv.d, argv.rw)
	}
})()