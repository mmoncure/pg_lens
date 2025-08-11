#!/usr/bin/env node
"use strict";
// import * as parser from 'libpg-query'
Object.defineProperty(exports, "__esModule", { value: true });
exports._createCompletions = exports._flatDiagnostics = exports._flatHighlights = exports._flattenedSearchSingleTarget = void 0;
exports.parse = parse;
exports.dfsFlatten = dfsFlatten;
// rexports
var search_1 = require("./util/search");
Object.defineProperty(exports, "_flattenedSearchSingleTarget", { enumerable: true, get: function () { return search_1._flattenedSearchSingleTarget; } });
var SemanticHighlights_1 = require("./semantic/SemanticHighlights");
Object.defineProperty(exports, "_flatHighlights", { enumerable: true, get: function () { return SemanticHighlights_1._flatHighlights; } });
var diagnostics_1 = require("./diagnostic/diagnostics");
Object.defineProperty(exports, "_flatDiagnostics", { enumerable: true, get: function () { return diagnostics_1._flatDiagnostics; } });
var completion_1 = require("./completion/completion");
Object.defineProperty(exports, "_createCompletions", { enumerable: true, get: function () { return completion_1._createCompletions; } });
const dotenv = require("dotenv");
const yargs_1 = require("yargs");
const types = require("./types");
const ParserTS = require("tree-sitter");
const SQL = require("@maximjov/tree-sitter-sql");
const parser = new ParserTS();
parser.setLanguage(SQL);
let argv;
const preTableInsertDelete = `DELETE FROM "table_columns"`;
const tableInsertText = `
	INSERT INTO "table_columns" (table_schema, table_name, column_name, column_type, is_not_null, column_default, stmt, start_position, end_position)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`;
const preFunctionInsertDelete = `DELETE FROM "function_args"`;
const functionInsertText = `
	INSERT INTO "function_args" (function_name, argument_name, argument_type, argument_default, stmt, start_position, end_position)
	VALUES ($1, $2, $3, $4, $5, $6, $7);`;
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
async function parse(client, doc, outPath, debug, outType) {
    let munchedSQL = [];
    // parse all SQL with tree-sitter
    const tree = parser.parse(doc);
    await dfsFlatten(tree.rootNode, "", munchedSQL);
    if (outType === "db") {
        try {
            // add DDL to db (CREATE TABLE for now)
            try {
                await client.query('BEGIN');
                await client.query(preTableInsertDelete);
                await _insertTableColumns(client, munchedSQL);
                await client.query('COMMIT');
            }
            catch (e) {
                await client.query('ROLLBACK');
                console.error(e);
            }
            try {
                await client.query('BEGIN');
                await client.query(preFunctionInsertDelete);
                await _insertFunctionColumns(client, munchedSQL);
                await client.query('COMMIT');
            }
            catch (e) {
                await client.query('ROLLBACK');
                console.error(e);
            }
            // await client.release() // Don't release, we want to use the same clients
        }
        catch (e) {
            await client.query('ROLLBACK');
        }
    }
    return munchedSQL;
}
// Tree sitter + flattened array setup, no trees
// Basically same functions-- rewritten to use an array instead of trees
async function dfsFlatten(node, _path, ret) {
    if (!node)
        return;
    const { startPosition, endPosition, type } = node;
    const coord = `${startPosition.row}:${startPosition.column} - ${endPosition.row}:${endPosition.column}`;
    if (type === "column_definition") {
        _path += `=${node.text.replace(/\n/g, "\\n")}`;
    }
    if (type === "function_argument") {
        _path += `=${node.text.replace(/\n/g, "\\n")}`;
    }
    if (type === "object_reference") {
        _path += `=${node.text.replace(/\n/g, "\\n")}`;
    }
    const stmtObj = {
        coords: coord,
        parsed: `${type}`,
        id: `${node.text.replace(/\n/g, "\\n")}`,
        path: _path
    };
    _path += `/${type}`;
    ret.push(stmtObj);
    for (const child of node.children) {
        dfsFlatten(child, _path, ret);
    }
}
async function _collectNodes(nodes, match) {
    let results = [];
    nodes.forEach(node => {
        if (node.parsed === match)
            results.push(node);
    });
    return results;
}
async function _insertTableColumns(client, nodes) {
    const columns = await _collectNodes(nodes, "column_definition");
    if (!columns)
        return;
    const idents = await _collectNodes(nodes, "identifier");
    if (!idents)
        return;
    const relations = await _collectNodes(nodes, "object_reference"); // need to implement going forward
    if (!relations)
        return;
    for (const col of columns) {
        let relation;
        // workaround for tree crap, matches obj_ref to col by coords
        for (let i = relations.length - 1; i >= 0; i--) {
            let colStart = col.coords.split(' - ')[0].split(":");
            let relationStart = relations[i].coords.split(' - ')[0].split(":");
            const linecheck = parseInt(colStart[0]) > parseInt(relationStart[0]) && !relations[i].path.includes("column_definition");
            const lineeq = parseInt(colStart[0]) == parseInt(relationStart[0]);
            const charcheck = parseInt(colStart[1]) > parseInt(relationStart[1]);
            // console.log(`lc: ${parseInt(colStart[0])} > ${parseInt(relationStart[0])}\nle: ${lineeq}\ncc: ${parseInt(colStart[1])} > ${parseInt(relationStart[1])}\n`)
            if (linecheck) {
                // console.log('linecheck')
                relation = relations[i].id;
                break;
            }
            else if (lineeq) {
                if (charcheck) {
                    // console.log('charcheck')
                    relation = relations[i].id;
                    break;
                }
            }
        }
        // god bless the order
        const idsIdx = nodes.findIndex((n) => n.path.includes(col.path) && n.
            parsed === ("identifier"));
        const ids = nodes[idsIdx];
        if (ids === undefined || ids.parsed === undefined) {
            console.error('No children: ', col);
            return;
        }
        const colName = ids.id;
        const startpos = ids.coords.split(" - ")[0];
        const endpos = ids.coords.split(" - ")[1];
        const datatypes = types.DATATYPE_KEYWORDS; // this is bad, needs work
        // really ghetto. I'm going to assume next index after Ident is type... can break
        // if broken sql, but then we shouldn't be adding to db anyway, so I'm just going to do it.
        let typeNode = nodes[idsIdx + 1]; // [..., ident, keyword, ...]
        if (!datatypes.includes(typeNode.id.toLowerCase())) {
            typeNode = nodes[idsIdx + 2];
        }
        const hasNotNull = (col.id.toLowerCase().includes("not") && col.id.toLowerCase().includes("null"));
        const hasDefault = col.id.toLowerCase().split(" ").findIndex((dlm) => dlm === 'default');
        const absoluteDefault = hasDefault >= 0 ? nodes.findIndex((n) => n.path.includes(col.path) && n.parsed.toLowerCase().includes('default')) : -1;
        const colDefault = hasDefault >= 0 && absoluteDefault >= 0 ? nodes[absoluteDefault + 1].id : null;
        try {
            /*
                INSERT INTO "table_columns" (table_schema, table_name, column_name, column_type, is_not_null, column_default, stmt, start_position, end_position)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`;
            */
            let g = await client.query(tableInsertText, ["public", relation, colName, typeNode.id, hasNotNull, colDefault, col.id, startpos, endpos]);
            // console.log(g)
        }
        catch (e) {
            // console.log("Probably an SQL error, but logged nonetheless")
            throw e;
        }
    }
}
async function _insertFunctionColumns(client, nodes) {
    const args = await _collectNodes(nodes, "function_argument");
    if (!args)
        return;
    const idents = await _collectNodes(nodes, "identifier");
    if (!idents)
        return;
    const relations = await _collectNodes(nodes, "object_reference");
    if (!relations)
        return;
    let relation;
    for (const arg of args) {
        for (let i = relations.length - 1; i >= 0; i--) {
            let argStart = arg.coords.split(' - ')[0].split(":");
            let relationStart = relations[i].coords.split(' - ')[0].split(":");
            const linecheck = parseInt(argStart[0]) > parseInt(relationStart[0]) && !relations[i].path.includes("function_argument");
            const lineeq = parseInt(argStart[0]) == parseInt(relationStart[0]);
            const charcheck = parseInt(argStart[1]) > parseInt(relationStart[1]);
            // console.log(`lc: ${parseInt(argStart[0])} > ${parseInt(relationStart[0])}\nle: ${lineeq}\ncc: ${parseInt(argStart[1])} > ${parseInt(relationStart[1])}\n`)
            if (linecheck) {
                // console.log('linecheck')
                relation = relations[i].id;
                break;
            }
            else if (lineeq) {
                if (charcheck) {
                    // console.log('charcheck')
                    relation = relations[i].id;
                    break;
                }
            }
        }
        // god bless the order
        const idsIdx = nodes.findIndex((n) => n.path.includes(arg.path) && n.
            parsed === ("identifier"));
        const ids = nodes[idsIdx];
        if (ids === undefined || ids.parsed === undefined) {
            console.error('No children: ', arg);
            return;
        }
        const argName = ids.id;
        const startpos = ids.coords.split(" - ")[0];
        const endpos = ids.coords.split(" - ")[1];
        const datatypes = types.DATATYPE_KEYWORDS; // this is bad, needs work
        // really ghetto. I'm going to assume next index after Ident is type... can break
        // if broken sql, but then we shouldn't be adding to db anyway, so I'm just going to do it.
        let typeNode = nodes[idsIdx + 1]; // [..., ident, keyword, ...]
        if (!datatypes.includes(typeNode.id.toLowerCase())) {
            if (typeNode.id.toLowerCase().includes(typeNode.parsed))
                typeNode = nodes[idsIdx + 2];
            else {
                console.log("can't find datatype", typeNode.id);
                return;
            }
        }
        const hasDefault = arg.id.toLowerCase().split(" ").findIndex((dlm) => dlm === 'default');
        const absoluteDefault = hasDefault >= 0 ? nodes.findIndex((n) => n.path.includes(arg.path) && n.parsed.toLowerCase().includes('default')) : -1;
        const colDefault = hasDefault >= 0 && absoluteDefault >= 0 ? nodes[absoluteDefault + 1].id : null;
        try {
            /*
                INSERT INTO "function_args" (function_name, argument_name, argument_type, argument_default, stmt, start_position, end_position)
                VALUES ($1, $2, $3, $4, $5, $6, $7);`
            */
            const g = (await client.query(functionInsertText, [relation, argName, typeNode.id, colDefault, arg.id, startpos, endpos]));
            // console.log(g)
        }
        catch (e) {
            // console.error("Probably an SQL error, but logged nonetheless\n\n", e)
            throw e;
        }
    }
}
// OLD FUNCTIONS, deprecated because it has been decided that I should move forward with a flattened
// array instead of with trees to remove recursion and potentially hard to read code.
// new tree-sitter (https://github.com/DerekStride/tree-sitter-sql)
/**
 *
 * ====== **DEPRACATED** ======
 *
 * Creates JSON array from `ParserTS.SyntaxNode`.
 * Recursively checks for children. Use parentObj in initial call for calls outside main.ts
 *
 * @param node main.ts updates (local munchedSQL gets modified)
 * @param parentObj anything else (parentObj get modified)
 */
// export async function jsonify(node: ParserTS.SyntaxNode, parentObj: types.stmtTreeSit | null = null) {
// 	const { startPosition, endPosition, type } = node;
// 	const coord = `${startPosition.row}:${startPosition.column} - ${endPosition.row}:${endPosition.column}`;
// 	const stmtObj: types.stmtTreeSit = {
// 		coords: coord,
// 		parsed: `${type}`,
// 		id: `${node.text.replace(/\n/g, "\\n")}`,
// 		nextstmt: []
// 	};
// 	if (parentObj) { // if function called with parent, insert node into parent's nextstmt array
// 		parentObj.nextstmt.push(stmtObj);
// 	}
// 	else { // if no parent, place at root
// 		mnchsql__OLD.splitstmts.push(stmtObj);
// 	}
// 	for (let child of node.children) { // for each child of node, call jsonify
// 		jsonify(child, stmtObj);
// 	}
// }
/**
 *
 * ====== **DEPRACATED** ======
 *
 * Recursively searches through tree adding predicate-matched nodes to results
 *
 * @param node
 * @param predicate
 * @param results
 *
 */
// function collectNodes(node: types.stmtTreeSit, predicate: Function /* apparently this is a thing lol */, results: any = []) {
// 	if (predicate(node)) results.push(node); // if node matches given predicate, add it to results
// 	(node.nextstmt || []).forEach(child => collectNodes(child, predicate, results)); // recursively modify results for each child given a node
// 	return results;
// }
/**
 *
 * ====== **DEPRACATED** ======
 *
 * Inserts columns from given munchedSQL. Expects schema = 'public'
 *
 * @param client
 * @param munchedSQL
 * @param defaultSchema
 */
// async function insertTableColumns(client: PoolClient, munchedSQL: any, defaultSchema = 'public') {
// 	if (!munchedSQL.splitstmts || !munchedSQL.splitstmts.length) return;
// 	const stmts = munchedSQL.splitstmts[0].nextstmt;
// 	// multi-statement handling
// 	for (const stmtObj of stmts) {
// 		if (stmtObj.parsed !== ';') { // added as its own leaf for some reason... not going to remove from tree for consistencies sake
// 			const objectRefs = collectNodes(stmtObj, (n: { parsed: string; }) => n.parsed === 'object_reference');
// 			if (!objectRefs.length) return;
// 			const idents = collectNodes(objectRefs[0], (n: { parsed: string; }) => n.parsed === 'identifier');
// 			if (!idents.length) return;
// 			const columns = collectNodes(stmtObj, (n: { parsed: string; }) => n.parsed === 'column_definition');
// 			if (!columns.length) return;
// 			for (const leaf of columns) {
// 				const children = leaf.nextstmt || [];
// 				const ids = children.find((n: { parsed: string; }) => n.parsed === 'identifier'); // 
// 				if (!ids) {
// 					console.warn('No children: ', leaf);
// 				}
// 				const colName = ids.id
// 				const startpos = ids.coords.split(" - ")[0]
// 				const endpos = ids.coords.split(" - ")[1]
// 				const datatypes = types.DATATYPE_KEYWORDS; // this is bad, needs work
// 				const typeNode = children.find((n: { parsed: string; }) => datatypes.includes(n.parsed.toLowerCase()));
// 				const colType = typeNode ? typeNode.id : null; // could throw error here, for now push forward
// 				const hasNotNull = children.some((n: { parsed: string; }) => n.parsed === 'keyword_not') && children.some((n: { parsed: string; }) => n.parsed === 'keyword_null');
// 				const hasDefault = children.findIndex((n: { parsed: string; }) => n.parsed === 'keyword_default');
// 				const colDefault = hasDefault >= 0 && children[hasDefault + 1] ? children[hasDefault + 1].id : null;
// 				try {
// 					let g = await client.query(tableInsertText, [defaultSchema, idents[0].id, colName, colType, hasNotNull, colDefault, stmtObj.id, startpos, endpos]);
// 				}
// 				catch (e: any) {
// 					// console.log("Probably an SQL error, but logged nonetheless")
// 					throw e
// 				}
// 			}
// 		}
// 	}
// 	// }
// }
/**
 *
 * ====== **DEPRACATED** ======
 *
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
// export function bfsSearchFirstTarget(data: types.stmtTreeSit, targetParsed: string, targetId: String, findId: boolean = false): types.searchReturn {
// 	let _path = ""
// 	if (!data) return {data: false, path: _path}
// 	const queue = [data];
// 	while (queue.length) {
// 		const node = queue.shift();
// 		_path = _path + `/${node?.parsed}`
// 		if (findId === false) {
// 			if ((node?.id.toLowerCase() === targetId.toLowerCase()) && node?.parsed.toLowerCase() === targetParsed.toLowerCase()) {
// 				return {data: true, path: _path}
// 			}
// 		}
// 		else {
// 			if (node?.parsed.toLowerCase() === targetParsed.toLowerCase()) {
// 				return {data: node?.id, path: _path }
// 			}
// 		}
// 		if (node?.nextstmt && node.nextstmt.length > 0) {
// 			for (const child of node.nextstmt) queue.push(child);
// 		}
// 	}
// 	return {data: false, path: _path};
// }
/**
 *
 * ====== **DEPRACATED** ======
 *
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
// export function bfsSearchMultiTarget(data: types.stmtTreeSit, targetParsed: string = '', targetId: string = '', match: 'parsed' | 'id' | 'both'): types.searchReturn {
// 	let _path = ''
// 	const hits: types.stmtTreeSit[] = [];
// 	if (!data) return {data: hits, path: _path};
// 	const queue = [data];
// 	while (queue.length) {
// 		const node = queue.shift();
// 		if (match === 'both') {
// 			if ((node?.id.toLowerCase() === targetId.toLowerCase()) && node?.parsed.toLowerCase() === targetParsed.toLowerCase()) {
// 				hits.push(node)
// 			}
// 		}
// 		else if (match === 'parsed') {
// 			if (node?.parsed.toLowerCase() === targetParsed.toLowerCase()) {
// 				hits.push(node)
// 			}
// 		}
// 		else {
// 			if (node?.id.toLowerCase() === targetId.toLowerCase()) {
// 				hits.push(node)
// 			}
// 		}
// 		if (node?.nextstmt && node.nextstmt.length > 0) {
// 			for (const child of node.nextstmt) queue.push(child);
// 		}
// 	}
// 	return {
// 		path: _path,
// 		data: hits
// 	};
// }
/**
 *
 * ====== **DEPRACATED** ======
 *
 * Creates diagnostics by calling `bfsSearchMultiTarget(root, "ERROR", "", 'parsed')`
 * which searches for nodes with a parsed value of `error`
 *
 * @param root
 * @param doc
 * @returns
 */
// export function createDiagnosticErrors(root: types.stmtTreeSit, doc: TextDocument) {
// 	if (!root) return;
// 	const diagnostics: Diagnostic[] = [];
// 	const errors = (bfsSearchMultiTarget(root, "ERROR", "", 'parsed')).data // bruh
// 	for (var i = 0; i < errors.length; i++) {
// 		const fancystart = (errors[i].coords.split("-"))[0].split(":")
// 		const fancyend = (errors[i].coords.split("-"))[1].split(":")
// 		const start: Position = { line: parseInt(fancystart[0]), character: parseInt(fancystart[1]) }
// 		const end: Position = { line: parseInt(fancyend[0]), character: parseInt(fancyend[1]) }
// 		const diagnostic: Diagnostic = {
// 			severity: DiagnosticSeverity.Error,
// 			range: {
// 				start: start,
// 				end: end,
// 			},
// 			message: `Our parsing does not permit more in depth error checking`, // maybe find more in depth error reporting?
// 			source: '\n\nIt is recommended to check out the docs: https://www.postgresql.org/docs/current/sql.html'
// 		};
// 		diagnostics.push(diagnostic);
// 	}
// 	return diagnostics
// }
/**
 *
 * ====== **DEPRACATED** ======
 *
 * Basic BFS with logic to create and sort highlights by start position
 *
 * @param root
 * @param doc
 * @returns
 */
// export function bfsHighlighint(root: types.stmtTreeSit, doc: TextDocument): SemanticTokensBuilder | undefined { // TODO: make standalone, dont use vscode typing
// 	// SWITCH THIS TO Depth First Search
// 	/*
// 	procedure DFS_iterative(G, v) is
//     let S be a stack
//     S.push(v)
//     while S is not empty do
//         v = S.pop()
//         if v is not labeled as discovered then
//             label v as discovered
//             for all edges from v to w in G.adjacentEdges(v) do 
//                 S.push(w)
// 	*/
// 	if (!root) return;
// 	const builder = new SemanticTokensBuilder();
// 	const q: types.stmtTreeSit[] = [root];
// 	const queue: any = [];
// 	while (q.length) {
// 		const n = q.shift()!;
// 		if (n.parsed.includes("keyword") || n.parsed.includes("identifier") || n.parsed.includes("literal")) { // ensures we only look at nodes we want to color
// 			const fancystart = (n.coords.split("-"))[0].split(":")
// 			const fancyend = (n.coords.split("-"))[1].split(":")
// 			const start: Position = { line: parseInt(fancystart[0]), character: parseInt(fancystart[1]) }
// 			const end: Position = { line: parseInt(fancyend[0]), character: parseInt(fancyend[1]) }
// 			const length = doc.offsetAt(end) - doc.offsetAt(start)
// 			let type;
// 			if (n.parsed.includes('keyword')) {
// 				type = tokenTypes.indexOf("keyword")
// 			}
// 			else if (n.parsed.includes('identifier')) {
// 				type = tokenTypes.indexOf("identifier")
// 			}
// 			else if (n.parsed.includes('literal')) {
// 				if (isNaN(parseInt(n.id)) && isNaN(parseFloat(n.id))) {
// 					type = tokenTypes.indexOf("literalStr")
// 				}
// 				else type = tokenTypes.indexOf("literalNum")
// 			}
// 			// add all nodes to queue (out of order)
// 			queue.push({
// 				oft: doc.offsetAt(start),
// 				stl: start.line,
// 				stc: start.character,
// 				len: length,
// 				typ: type,
// 				dum: 0
// 			});
// 		}
// 		if (n.nextstmt) q.push(...n.nextstmt);
// 	}
// 	queue.sort((a: any, b: any) => a.oft - b.oft); // now we sort queue because semantic highlights require inputs to be in order
// 	for (var i = 0; i < queue.length; i++) { // push ordered queue into semantic highlight builder
// 		builder.push(queue[i].stl, queue[i].stc, queue[i].len, queue[i].typ, queue[i].dum)
// 	}
// 	// console.log(builder)
// 	return builder
// }
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