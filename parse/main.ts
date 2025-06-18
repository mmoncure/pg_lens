import * as parser from 'libpg-query'
import * as types from '../types'
import { create } from 'domain';
import { inspect } from 'util'
import * as fs from 'fs'
import { Client } from 'pg'
import * as dotenv from 'dotenv'

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


async function parse(document: string) {
	var sampleSQLtest = fs.readFileSync('../sampleComplex.sql').toString()
	console.log(sampleSQLtest)
	const splitSQL: types.pAndSql = await lintPSQL(sampleSQLtest);
	// console.log(splitSQL.sql)
	const stmts = await createStatements(splitSQL.sql,splitSQL.psql)
	fs.writeFileSync("./dog.json", JSON.stringify(stmts,null,2))
	process.exit(1)
}

async function lintPSQL(document: string): Promise<types.pAndSql> { 
	const backslashLines: string[] = document.match(/^\\.*$/gm) || [];
	const cleaned = document.replace(/^\\.*$/gm, '').replace(/^\s*[\r\n]/gm, '');
	return ({sql: cleaned, psql: backslashLines})
}

async function createStatements(lintedDocument: string, psql: string[]): Promise<types.stmtArr> {
	const statements = [];
let currentStatement = '';
let insideSingleQuote = false;
let previousChar = '';
let statementStartIndex = 0;

for (let i = 0; i < lintedDocument.length; i++) {
    const char = lintedDocument[i];

    if (char === "'" && previousChar !== '\\') {
        insideSingleQuote = !insideSingleQuote;
    }

    if (!insideSingleQuote && char === ';') {
        const trimmedStatement = currentStatement.trim();
        const startOffset = lintedDocument.indexOf(trimmedStatement, statementStartIndex);
        const stmtLen = trimmedStatement.length;

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
	await client.connect()
	await parse("test")
})()