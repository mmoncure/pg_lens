#!/usr/bin/env node
"use strict";
// import * as parser from 'libpg-query'
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenTypes = exports.createContext = void 0;
exports.parse = parse;
exports.jsonify = jsonify;
exports.treeSearch = treeSearch;
exports.treeSearchMulti = treeSearchMulti;
exports.bfsDiagnostics = bfsDiagnostics;
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
];
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
    // fs.writeFileSync('../stdout/dog.json', "SHIT")
    munchedSQL = {
        splitstmts: []
    };
    // await client.connect()
    // parse all SQL with tree-sitter
    const tree = parser.parse(doc);
    jsonify(tree.rootNode);
    // console.log('parse')
    try {
        // add DDL to db (CREATE TABLE for now)
        await client.query('BEGIN');
        await client.query(preInsertDelete);
        await insertTableColumns(client, munchedSQL, "public");
        await client.query('COMMIT');
        // await client.release()
        // console.log('parse done')
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
async function jsonify(node, parentObj = null) {
    const { startPosition, endPosition, type } = node;
    const coord = `${startPosition.row}:${startPosition.column} - ${endPosition.row}:${endPosition.column}`;
    // console.log(type)
    const thisObj = {
        coords: coord,
        parsed: `${type}`,
        id: `${node.text.replace(/\n/g, "\\n")}`,
        nextstmt: []
    };
    // if (type === "ERROR") {
    // 	console.log(munchedSQL.splitstmts)
    // 	munchedSQL.splitstmts.push(thisObj);
    // } 
    if (parentObj) {
        parentObj.nextstmt.push(thisObj);
    }
    else {
        munchedSQL.splitstmts.push(thisObj);
    }
    for (let child of node.children) {
        jsonify(child, thisObj);
    }
}
function collectNodes(node, predicate /* apparently this is a thing lol */, results = []) {
    if (predicate(node))
        results.push(node);
    (node.nextstmt || []).forEach(child => collectNodes(child, predicate, results));
    return results;
}
async function insertTableColumns(client, munchedSQL, defaultSchema = 'public') {
    if (!munchedSQL.splitstmts || !munchedSQL.splitstmts.length)
        return;
    // let pd = await client.query(preInsertDelete)
    const stmts = munchedSQL.splitstmts[0].nextstmt;
    // console.log(stmts.length)
    // console.log(stmts)
    // multi-statement handling
    // if (pd) {
    for (const stmtObj of stmts) {
        if (stmtObj.parsed !== ';') { // added as its own leaf for some reason... not going to remove from 
            // tree for consistencies sake
            // console.log('here')
            // checksums
            const objectRefs = collectNodes(stmtObj, (n) => n.parsed === 'object_reference');
            if (!objectRefs.length)
                return;
            const idents = collectNodes(objectRefs[0], (n) => n.parsed === 'identifier');
            if (!idents.length)
                return;
            const columns = collectNodes(stmtObj, (n) => n.parsed === 'column_definition');
            if (!columns.length)
                return;
            // console.log('here1')
            // try {
            // 	let pd = await client.query(preInsertDelete)
            // }
            // catch (e: any) {
            // 	console.log("Probably an SQL error, but logged nonetheless")
            // 	console.error(e)
            // }
            // console.log(idents[0].id)
            for (const leaf of columns) {
                const children = leaf.nextstmt || [];
                const ids = children.find((n) => n.parsed === 'identifier');
                if (!ids) {
                    console.warn('No children: ', leaf);
                }
                const colName = ids.id;
                const startpos = ids.coords.split(" - ")[0];
                const endpos = ids.coords.split(" - ")[1];
                const datatypes = types.DATATYPE_KEYWORDS;
                const typeNode = children.find((n) => datatypes.includes(n.parsed.toLowerCase()));
                // console.log(typeNode)
                const colType = typeNode ? typeNode.id : null;
                const hasNotNull = children.some((n) => n.parsed === 'keyword_not') && children.some((n) => n.parsed === 'keyword_null');
                const defIdx = children.findIndex((n) => n.parsed === 'keyword_default');
                const colDefault = defIdx >= 0 && children[defIdx + 1] ? children[defIdx + 1].id : null;
                try {
                    // await client.query('BEGIN')
                    // console.log(colName)
                    let g = await client.query(insertText, [defaultSchema, idents[0].id, colName, colType, hasNotNull, colDefault, stmtObj.id, startpos, endpos]);
                    // console.log(g)
                    // await client.query('COMMIT')
                    // let pd = await client.query(preInsertDelete)
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
 * Recursively checks whether any node in the AST has
 * `parsed === targetParsed` and `id === targetId`
 *
 * toLowerCase() enforced
 *
 */
function treeSearch(data, targetParsed, targetId, findId) {
    function recurse(node) {
        if (!findId) {
            if (node.parsed.toLowerCase() === targetParsed.toLowerCase() &&
                node.id.toLowerCase() === targetId.toLowerCase()) {
                return true;
            }
            if (Array.isArray(node.nextstmt)) {
                for (const child of node.nextstmt) {
                    if (recurse(child) === true)
                        return true;
                }
            }
            return false;
        }
        else {
            // only match on `parsed`, return the node.id when found
            if (node.parsed.toLowerCase() === targetParsed.toLowerCase()) {
                return node.id;
            }
            if (Array.isArray(node.nextstmt)) {
                for (const child of node.nextstmt) {
                    const res = recurse(child);
                    if (res !== false)
                        return res;
                }
            }
            return false;
        }
    }
    if (Array.isArray(data)) {
        if (!findId) {
            return data.some(node => recurse(node) === true);
        }
        for (const node of data) {
            const res = recurse(node);
            if (res !== false)
                return res;
        }
        return false;
    }
    else if (data && typeof data === 'object') {
        return recurse(data);
    }
    return false;
}
function treeSearchMulti(data, targetParsed, targetId, findId) {
    const hits = [];
    const tp = targetParsed.toLowerCase();
    const tid = targetId.toLowerCase();
    const visit = (node) => {
        const parsedOK = node.parsed.toLowerCase() === tp;
        if (findId) {
            if (parsedOK)
                hits.push(node);
        }
        else {
            const idOK = !targetId || node.id.toLowerCase() === tid;
            if (parsedOK && idOK)
                hits.push(node);
        }
        if (node.nextstmt) {
            for (const child of node.nextstmt)
                visit(child);
        }
    };
    if (Array.isArray(data)) {
        for (const n of data)
            visit(n);
    }
    else if (data) {
        visit(data);
    }
    return hits;
}
function bfsDiagnostics(root, doc) {
    if (!root)
        return;
    const diagnostics = [];
    // console.log(JSON.stringify(root,null,2))
    // const q: types.stmtTreeSit[] = [errorRoot];
    // console.log((q[3].coords.split("-"))[0].split(":"))
    // console.log((q[3].coords.split("-"))[1].split(":"))
    // console.log(root.nextstmt.length)
    // console.log("===")
    // console.log(root);
    const errors = (treeSearchMulti(root, "ERROR", '', true)); // bruh
    // console.log(errors)
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
            message: `Our parsing does not permit more in depth error checking`,
            source: '\n\nIt is recommended to check out the docs: https://www.postgresql.org/docs/current/sql.html'
        };
        diagnostics.push(diagnostic);
        // const { start, end, kind } = classify(node); // map node → tokenType/modifiers
        // if (n.nextstmt) q.push(...n.nextstmt);
    }
    return diagnostics;
}
function bfsHighlighint(root, doc) {
    if (!root)
        return;
    const builder = new vscode_languageserver_1.SemanticTokensBuilder();
    const q = [root];
    // console.log((q[3].coords.split("-"))[0].split(":"))
    // console.log((q[3].coords.split("-"))[1].split(":"))
    const queue = [];
    // q.shift()!;
    while (q.length) {
        const n = q.shift();
        if (n.parsed.includes("keyword") || n.parsed.includes("identifier") || n.parsed.includes("literal")) { // quick check! IMPLEMENT THIS OUT
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
                // console.log((parseInt(n.parsed)), (parseFloat(n.parsed)), isNaN(parseInt(n.parsed)) && (n.parsed))
                if (isNaN(parseInt(n.id)) && isNaN(parseFloat(n.id))) {
                    type = exports.tokenTypes.indexOf("literalStr");
                }
                else
                    type = exports.tokenTypes.indexOf("literalNum");
            }
            else if (n.parsed.includes('error')) {
                // console.log((parseInt(n.parsed)), (parseFloat(n.parsed)), isNaN(parseInt(n.parsed)) && (n.parsed))
                if (isNaN(parseInt(n.id)) && isNaN(parseFloat(n.id))) {
                    type = exports.tokenTypes.indexOf("literalStr");
                }
                else
                    type = exports.tokenTypes.indexOf("literalNum");
            }
            queue.push({
                oft: doc.offsetAt(start),
                stl: start.line,
                stc: start.character,
                len: length,
                typ: type,
                dum: 0 // bitmask of modifiers
            });
        }
        // const { start, end, kind } = classify(node); // map node → tokenType/modifiers
        if (n.nextstmt)
            q.push(...n.nextstmt);
    }
    queue.sort((a, b) => a.oft - b.oft);
    for (var i = 0; i < queue.length; i++) {
        // console.log('==\nstartl: ', queue[i].stl)
        // console.log('startc: ', queue[i].stc)
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