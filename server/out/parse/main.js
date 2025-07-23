#!/usr/bin/env node
"use strict";
// import * as parser from 'libpg-query'
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenTypes = exports.createContext = void 0;
exports.parse = parse;
exports.jsonify = jsonify;
exports.bfsSearchFirstTarget = bfsSearchFirstTarget;
exports.bfsSearchMultiTarget = bfsSearchMultiTarget;
exports.createDiagnosticErrors = createDiagnosticErrors;
exports.bfsHighlighint = bfsHighlighint;
const types = require("../types");
var createContext_1 = require("./createContext"); // rexport
Object.defineProperty(exports, "createContext", { enumerable: true, get: function () { return createContext_1.createContext; } });
const dotenv = require("dotenv");
const yargs_1 = require("yargs");
const ParserTS = require("tree-sitter");
const SQL = require("@derekstride/tree-sitter-sql");
const vscode_languageserver_1 = require("vscode-languageserver");
const parser = new ParserTS();
parser.setLanguage(SQL);
let argv;
exports.tokenTypes = [
    'namespace', 'type', 'class', 'enum', 'interface', 'struct', 'typeParameter',
    'parameter', 'variable', 'keyword', 'enumMember', 'event', 'function', 'method',
    'macro', 'label', 'comment', 'literalStr', 'identifier', 'literalNum', 'regexp', 'operator'
]; // Most of the color types, this is a copy of the original list from server.ts, but with changes to specific ones to make it easier to read in use, index matters, the word does not.
const preInsertDelete = `DELETE FROM "table_columns" WHERE table_schema='public'`; // change ASAP
const insertText = `
	INSERT INTO "table_columns" (table_schema, table_name, column_name, column_type, is_not_null, column_default, stmt, start_position, end_position)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`;
try {
    argv = (0, yargs_1.default)(process.argv.slice(2)).options({
        i: { type: 'string', demandOption: true },
        o: { type: 'string' },
        rw: { type: 'string', choices: ['db', 'stdout'], demandOption: true },
        d: { type: 'boolean', default: false }
    }).parseSync();
}
catch (e) {
    argv = {
        d: false
    };
}
dotenv.config({ path: "/Users/maxim.jovanovic/Desktop/testlsp/.env" });
// pg setup
// console.log(process.env.PG_USER)
let munchedSQL = {
    splitstmts: []
};
// export async function delAll(client: Client) {
// 	let pd = await client.query(preInsertDelete)
// }
async function parse(client, doc, outPath, debug, outType) {
    munchedSQL = {
        splitstmts: []
    };
    // parse all SQL with tree-sitter
    const tree = parser.parse(doc);
    jsonify(tree.rootNode);
    try {
        // add DDL to db (CREATE TABLE for now)
        await client.query('BEGIN');
        await client.query(preInsertDelete);
        await insertTableColumns(client, munchedSQL, "public");
        await client.query('COMMIT');
        // await client.release() // Don't release, we want to use the same clients
    }
    catch (e) {
        // console.log(e)
        await client.query('ROLLBACK');
    }
    // await client.end()
    // const splitSQL: types.pAndSql = await lintPSQL(doc);
    // const stmts = await createStatements(splitSQL.sql,splitSQL.psql)
    // // if (outType === "stdout") {
    // 	// console.log(stmts)
    // 	// fs.writeFileSync(path.join('../stdout', outPath || "./dog.json"), JSON.stringify(stmts,null,2))
    // 	// process.stdout.write(`OUT: \n${JSON.stringify(stmts,null,2)}`)
    // 	return stmts
    // // }
    return munchedSQL;
}
// new tree-sitter (https://github.com/DerekStride/tree-sitter-sql)
/**
 * Creates JSON array from `ParserTS.SyntaxNode`.
 * Recursively checks for children. Use parentObj in initial call for calls outside main.ts
 *
 * @param node main.ts updates (local munchedSQL gets modified)
 * @param parentObj anything else (parentObj get modified)
 */
async function jsonify(node, parentObj = null) {
    const { startPosition, endPosition, type } = node;
    const coord = `${startPosition.row}:${startPosition.column} - ${endPosition.row}:${endPosition.column}`;
    const stmtObj = {
        coords: coord,
        parsed: `${type}`,
        id: `${node.text.replace(/\n/g, "\\n")}`,
        nextstmt: []
    };
    if (parentObj) { // if function called with parent, insert node into parent's nextstmt array
        parentObj.nextstmt.push(stmtObj);
    }
    else { // if no parent, place at root
        munchedSQL.splitstmts.push(stmtObj);
    }
    for (let child of node.children) { // for each child of node, call jsonify
        jsonify(child, stmtObj);
    }
}
/**
 * Recursively searches through tree adding predicate-matched nodes to results
 *
 * @param node
 * @param predicate
 * @param results
 *
 */
function collectNodes(node, predicate /* apparently this is a thing lol */, results = []) {
    if (predicate(node))
        results.push(node); // if node matches given predicate, add it to results
    (node.nextstmt || []).forEach(child => collectNodes(child, predicate, results)); // recursively modify results for each child given a node
    return results; // return up results
}
/**
 * Inserts columns from given munchedSQL. Expects schema = 'public'
 *
 * @param client
 * @param munchedSQL
 * @param defaultSchema
 */
async function insertTableColumns(client, munchedSQL, defaultSchema = 'public') {
    if (!munchedSQL.splitstmts || !munchedSQL.splitstmts.length)
        return;
    const stmts = munchedSQL.splitstmts[0].nextstmt;
    // multi-statement handling
    for (const stmtObj of stmts) {
        if (stmtObj.parsed !== ';') { // added as its own leaf for some reason... not going to remove from tree for consistencies sake
            const objectRefs = collectNodes(stmtObj, (n) => n.parsed === 'object_reference');
            if (!objectRefs.length)
                return;
            const idents = collectNodes(objectRefs[0], (n) => n.parsed === 'identifier');
            if (!idents.length)
                return;
            const columns = collectNodes(stmtObj, (n) => n.parsed === 'column_definition');
            if (!columns.length)
                return;
            for (const leaf of columns) { // iterates through columns
                const children = leaf.nextstmt || [];
                const ids = children.find((n) => n.parsed === 'identifier'); // searches children for parsed == 'identifier' returns as ids.
                if (!ids) {
                    console.warn('No children: ', leaf);
                }
                const colName = ids.id;
                const startpos = ids.coords.split(" - ")[0];
                const endpos = ids.coords.split(" - ")[1];
                const datatypes = types.DATATYPE_KEYWORDS; // this is bad, needs work
                const typeNode = children.find((n) => datatypes.includes(n.parsed.toLowerCase())); // searches for datatype in parsed from children []
                const colType = typeNode ? typeNode.id : null; // could throw error here, for now push forward
                const hasNotNull = children.some((n) => n.parsed === 'keyword_not') && children.some((n) => n.parsed === 'keyword_null');
                const hasDefault = children.findIndex((n) => n.parsed === 'keyword_default');
                const colDefault = hasDefault >= 0 && children[hasDefault + 1] ? children[hasDefault + 1].id : null; // returns next child in children if column has keyword_default, aka, the default value
                try {
                    let g = await client.query(insertText, [defaultSchema, idents[0].id, colName, colType, hasNotNull, colDefault, stmtObj.id, startpos, endpos]);
                }
                catch (e) {
                    // console.log("Probably an SQL error, but logged nonetheless")
                    throw e;
                }
            }
        }
    }
    // }
}
/**
 * Basic BFS with logic to return true on:
 * `parsed === targetParsed` and `id === targetId`
 *
 * Also can return node.id when `findId === true` and `targetParsed === parsed`
 *
 * toLowerCase() enforced
 *
 * @param data
 * @param targetParsed
 * @param targetId
 * @param findId
 *
 */
function bfsSearchFirstTarget(data, targetParsed, targetId, findId = false) {
    let _path = "";
    if (!data)
        return { data: false, path: _path };
    const queue = [data];
    while (queue.length) {
        const node = queue.shift();
        if (findId === false) {
            if ((node?.id.toLowerCase() === targetId.toLowerCase()) && node?.parsed.toLowerCase() === targetParsed.toLowerCase()) {
                return { data: true, path: _path };
            }
        }
        else {
            if (node?.parsed.toLowerCase() === targetParsed.toLowerCase()) {
                return { data: node?.id, path: _path };
            }
        }
        if (node?.nextstmt && node.nextstmt.length > 0) {
            for (const child of node.nextstmt)
                queue.push(child);
        }
    }
    return { data: false, path: _path };
}
/**
 * Basic BFS with logic to return hits on:
 * `parsed === targetParsed` and/or `id === targetId`
 *
 * toLowerCase() enforced
 * @param data
 * @param targetParsed
 * @param targetId
 * @param match
 * @returns
 */
function bfsSearchMultiTarget(data, targetParsed = '', targetId = '', match) {
    let _path = '';
    const hits = [];
    if (!data)
        return { data: hits, path: _path };
    const queue = [data];
    while (queue.length) {
        const node = queue.shift();
        if (match === 'both') {
            if ((node?.id.toLowerCase() === targetId.toLowerCase()) && node?.parsed.toLowerCase() === targetParsed.toLowerCase()) {
                hits.push(node);
            }
        }
        else if (match === 'parsed') {
            if (node?.parsed.toLowerCase() === targetParsed.toLowerCase()) {
                hits.push(node);
            }
        }
        else {
            if (node?.id.toLowerCase() === targetId.toLowerCase()) {
                hits.push(node);
            }
        }
        if (node?.nextstmt && node.nextstmt.length > 0) {
            for (const child of node.nextstmt)
                queue.push(child);
        }
    }
    return {
        path: _path,
        data: hits
    };
}
/**
 * Creates diagnostics by calling `bfsSearchMultiTarget(root, "ERROR", "", 'parsed')`
 * which searches for nodes with a parsed value of `error`
 *
 * @param root
 * @param doc
 * @returns
 */
function createDiagnosticErrors(root, doc) {
    if (!root)
        return;
    const diagnostics = [];
    const errors = (bfsSearchMultiTarget(root, "ERROR", "", 'parsed')).data; // bruh
    for (var i = 0; i < errors.length; i++) {
        const fancystart = (errors[i].coords.split("-"))[0].split(":");
        const fancyend = (errors[i].coords.split("-"))[1].split(":");
        const start = { line: parseInt(fancystart[0]), character: parseInt(fancystart[1]) };
        const end = { line: parseInt(fancyend[0]), character: parseInt(fancyend[1]) };
        const diagnostic = {
            severity: vscode_languageserver_1.DiagnosticSeverity.Error,
            range: {
                start: start,
                end: end,
            },
            message: `Our parsing does not permit more in depth error checking`, // maybe find more in depth error reporting?
            source: '\n\nIt is recommended to check out the docs: https://www.postgresql.org/docs/current/sql.html'
        };
        diagnostics.push(diagnostic);
    }
    return diagnostics;
}
/**
 * Basic BFS with logic to create and sort highlights by start position
 *
 * @param root
 * @param doc
 * @returns
 */
function bfsHighlighint(root, doc) {
    if (!root)
        return;
    const builder = new vscode_languageserver_1.SemanticTokensBuilder();
    const q = [root];
    const queue = []; // lol
    while (q.length) {
        const n = q.shift();
        if (n.parsed.includes("keyword") || n.parsed.includes("identifier") || n.parsed.includes("literal")) { // ensures we only look at nodes we want to color
            const fancystart = (n.coords.split("-"))[0].split(":");
            const fancyend = (n.coords.split("-"))[1].split(":");
            const start = { line: parseInt(fancystart[0]), character: parseInt(fancystart[1]) };
            const end = { line: parseInt(fancyend[0]), character: parseInt(fancyend[1]) };
            const length = doc.offsetAt(end) - doc.offsetAt(start);
            let type;
            if (n.parsed.includes('keyword')) {
                type = exports.tokenTypes.indexOf("keyword");
            }
            else if (n.parsed.includes('identifier')) {
                type = exports.tokenTypes.indexOf("identifier");
            }
            else if (n.parsed.includes('literal')) {
                if (isNaN(parseInt(n.id)) && isNaN(parseFloat(n.id))) {
                    type = exports.tokenTypes.indexOf("literalStr");
                }
                else
                    type = exports.tokenTypes.indexOf("literalNum");
            }
            // add all nodes to queue (out of order)
            queue.push({
                oft: doc.offsetAt(start),
                stl: start.line,
                stc: start.character,
                len: length,
                typ: type,
                dum: 0
            });
        }
        if (n.nextstmt)
            q.push(...n.nextstmt);
    }
    queue.sort((a, b) => a.oft - b.oft); // now we sort queue because semantic highlights require inputs to be in order
    for (var i = 0; i < queue.length; i++) { // push ordered queue into semantic highlight builder
        builder.push(queue[i].stl, queue[i].stc, queue[i].len, queue[i].typ, queue[i].dum);
    }
    // console.log(builder)
    return builder;
}
// old (libpg_query tests)
// async function lintPSQL(document: string): Promise<types.pAndSql> {
// 	if (argv.d) process.stdout.write(`DEBUG: Parsing out \\ statements\n`);
// 	const backslashLines: string[] = document.match(/^\\.*$/gm) || [];
// 	if (argv.d) process.stdout.write(`DEBUG: Stripping backslash lines\n`);
// 	let cleaned = document.replace(/^\\.*$/gm, '');
// 	if (argv.d) process.stdout.write(`DEBUG: Stripping SQL comments\n`);
// 	cleaned = cleaned.replace(/--.*(?=\r?\n|$)/g, match =>' '.repeat(match.length));
// 	cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\r\n]/g, ' '));
// 	return {sql:  cleaned, psql: backslashLines};
// }
// async function createStatements(
//   lintedDocument: string,
//   psql: string[]
// ): Promise<types.stmtArr> {
// 	const statements: types.stmtObj[] = [];
// 	let statementStartIndex = 0;
// 	let insideSingleQuote = false;
// 	let previousChar = '';
// 	function getLineInfo(absIndex: number) {
// 		const upTo = lintedDocument.slice(0, absIndex);
// 		const lineNum = upTo.split('\n').length - 1;
// 		const lastNewlineIdx = upTo.lastIndexOf('\n');
// 		const charInLine = absIndex - (lastNewlineIdx + 1);
// 		return { lineNum, charInLine };
// 	}
// 	if (argv.d) process.stdout.write(`DEBUG: Starting splitter\n`);
// 	for (let i = 0; i < lintedDocument.length; i++) {
// 		const char = lintedDocument[i];
// 		if (char === "'" && previousChar !== '\\') {
// 		insideSingleQuote = !insideSingleQuote;
// 		}
// 		if (!insideSingleQuote && char === ';') {
// 			const rawStmt = lintedDocument.slice(statementStartIndex, i);
// 			const trimmed  = rawStmt.trim();
// 			const leadingWS = rawStmt.length - rawStmt.trimStart().length;
// 			const absStart = statementStartIndex + leadingWS;
// 			const absEnd = i - 1; 
// 			const { lineNum: startLine, charInLine: startChar } = getLineInfo(absStart);
// 			const { lineNum: endLine,   charInLine: endChar   } = getLineInfo(absEnd);
// 			if (argv.d) process.stdout.write(
// 				`DEBUG: Stmt from ${startLine}:${startChar} to ${endLine}:${endChar}\n`
// 			);
// 			try {
// 				const parsified = await parser.parseQuery(trimmed);
// 				if (!parsified.stmts) throw new Error("Parser returned no stmts");
// 				statements.push({stmt: parsified.stmts[0].stmt, stmt_location: startLine, stmt_start: startChar, stmt_len: endChar + 1, stmt_endlocation: endLine, error: false, reason: undefined });
// 			} catch (e: any) {
// 				if (argv.d) process.stdout.write(`ERROR: ${e}\n`);
// 				statements.push({ stmt: undefined, stmt_location: startLine, stmt_start: startChar, stmt_len: endChar + 1, stmt_endlocation: endLine, error: true, reason: e.toString() });
// 			}
// 			statementStartIndex = i + 1;
// 		}
// 		previousChar = char;
//   	}
// 	// fixing trailing semicolon issue
// 	const rawStmt = lintedDocument.slice(statementStartIndex);
//   	if (rawStmt.trim().length > 0) {
// 		const trimmed = rawStmt.trim();
// 		const absStart = statementStartIndex + (rawStmt.length - rawStmt.trimStart().length);
// 		const absEnd = lintedDocument.length - 1;
// 		const { lineNum: startLine, charInLine: startChar } = getLineInfo(absStart);
// 		const { lineNum: endLine,   charInLine: endChar   } = getLineInfo(absEnd);
// 		if (argv.d) process.stdout.write(
// 			`DEBUG: Final stmt from ${startLine}:${startChar} to ${endLine}:${endChar}\n`
// 		);
// 		try {
// 			const parsified = await parser.parseQuery(trimmed);
// 			if (!parsified.stmts) throw new Error("Parser returned no stmts");
// 				statements.push({stmt: parsified.stmts[0].stmt, stmt_location: startLine, stmt_start: startChar, stmt_len: endChar + 1, stmt_endlocation: endLine, error: false, reason: undefined,
// 			});
// 		} catch (e: any) {
// 			if (argv.d) process.stdout.write(`ERROR: ${e}\n`);
// 				statements.push({ stmt: undefined, stmt_location: startLine, stmt_start: startChar, stmt_len: endChar + 1, stmt_endlocation: endLine, error: true, reason: e.toString() });
// 		}
//   	}
//   return { statements, psql };
// }
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