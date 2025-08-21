#!/usr/bin/env node

// rexports

export { _flattenedSearchSingleTarget } from './util/search'
export { _flatHighlights } from './semantic/SemanticHighlights'
export { _flatDiagnostics } from './diagnostic/diagnostics'
export { _createCompletions } from './completion/completion'
export { _clearDbTables } from './util/clear'


import { Client } from 'pg'
import * as dotenv from 'dotenv'

import logger from './util/log';
import * as types from './types'
import * as ParserTS from 'tree-sitter'
import * as SQL from '@maximjov/tree-sitter-sql'
import * as fs from 'fs'

const parser = new ParserTS();

const options: ParserTS.Options = {
  bufferSize: 1024 * 1024
};

parser.setLanguage(SQL);

const preTableInsertDelete = `DELETE FROM "table_columns" WHERE path_file=$1`
const tableInsertText = `
	INSERT INTO "table_columns" (table_schema, table_name, column_name, column_type, is_not_null, column_default, stmt, start_position, end_position, path_file)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);`;
const preFunctionInsertDelete = `DELETE FROM "function_args" WHERE path_file=$1`
const functionInsertText = `
	INSERT INTO "function_args" (function_name, argument_name, argument_type, argument_default, stmt, start_position, end_position, path_file)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`;	

dotenv.config({ path: "/Users/maxim.jovanovic/Desktop/testlsp/.env" });

/**
 * Parses the given SQL document, flattens its syntax tree, and optionally inserts table and function metadata into the database.
 *
 * @param client - PostgreSQL Client for DB operations.
 * @param doc - SQL document string to parse.
 * @param file_path - Path of the file being parsed.
 * @param outType - If true, performs database operations; otherwise, only parses the document.
 * @returns Flattened array of parsed statements.
 */
export async function parse(client: Client, doc: string, outType: boolean, file_path: string) {
	logger.log("Parsing document...");
	let munchedSQL: types.flattenedStmts = []

	const tree = parser.parse(doc, undefined, options)
	logger.log("Document parsed into syntax tree.");
	await dfsFlatten(tree!.rootNode, "", munchedSQL);
	// console.log(munchedSQL.length)

	if (outType === true) {

			// add DDL to db (CREATE TABLE for now)
			try {
				await client.query('BEGIN')
				await client.query(preTableInsertDelete, [file_path])
				await _insertTableColumns(client, munchedSQL, file_path)
				await client.query('COMMIT')
			}
			catch(e) {
				await client.query('ROLLBACK')
				logger.log(e)
			}
			try {
				await client.query('BEGIN')
				await client.query(preFunctionInsertDelete, [file_path])
				await _insertFunctionColumns(client, munchedSQL, file_path)
				await client.query('COMMIT')
			}
			catch(e) {
				await client.query('ROLLBACK')
				logger.log(e)
			}

			// await client.release() // Don't release, we want to use the same clients
	}
	return munchedSQL
}

// Tree sitter + flattened array setup, no trees

// Basically same functions-- rewritten to use an array instead of trees

/**
 * Recursively traverses a Tree-sitter syntax node and flattens it into an array of statement objects.
 *
 * @param node - The Tree-sitter syntax node to traverse.
 * @param _path - Current path string for node hierarchy.
 * @param ret - Array to collect flattened statement objects.
 */
export async function dfsFlatten(node: ParserTS.SyntaxNode, _path: string, ret: types.flattenedStmts): Promise<void> {
	// logger.log(`Traversing node: ${node.type} at path: ${_path}`);
	if (!node) return;
	const { startPosition, endPosition, type } = node;
	const coord = `${startPosition.row}:${startPosition.column} - ${endPosition.row}:${endPosition.column}`;
	if (type === "column_definition") {
		_path += `=${node.text.replace(/\n/g, "\\n")}`
	}
	if (type === "function_argument") {
		_path += `=${node.text.replace(/\n/g, "\\n")}`
	}
	if (type === "object_reference") {
		_path += `=${node.text.replace(/\n/g, "\\n")}`
	}
 	const stmtObj: types.stmtFlatTreeSit = {
		coords: coord,
		parsed: `${type}`,
		id: `${node.text.replace(/\n/g, "\\n")}`,
		path: _path
	};
	_path += `/${type}`
	ret.push(stmtObj)

	for (const child of node.children) {
    	dfsFlatten(child, _path, ret);
  	}
}

/**
 * Collects nodes from a flattened statement array that match the given type.
 *
 * @param nodes - Array of flattened statement objects.
 * @param match - Node type to match.
 * @returns Array of matching nodes.
 */
async function _collectNodes(nodes: types.flattenedStmts, match: string) {
	logger.log(`Collecting nodes of type: ${match}`);
	let results: any[] = []
	nodes.forEach(node => {
		if (node.parsed === match) results.push(node)
	})
	return results
}


/**
 * Extracts relation, name, type, and default value from a node.
 *
 * @param item - The column or argument node.
 * @param nodes - The flattened statement nodes.
 * @param relations - The relation nodes.
 * @param typeKeyword - Used for path filtering ("column_definition" or "function_argument").
 * @returns { relation, name, typeNode, defaultValue, startpos, endpos }
 */
function extractNodeMeta(item: any, nodes: types.flattenedStmts, relations: any[], typeKeyword: string) {
    let relation: any;
    for (let i = relations.length - 1; i >= 0; i--) {
        let itemStart = item.coords.split(' - ')[0].split(":");
        let relationStart = relations[i].coords.split(' - ')[0].split(":");
        if (parseInt(itemStart[0]) > parseInt(relationStart[0]) && !relations[i].path.includes(typeKeyword) || 
		(parseInt(itemStart[0]) == parseInt(relationStart[0]) && parseInt(itemStart[1]) > parseInt(relationStart[1]))) {
            relation = relations[i].id;
            break;
        }
    }
    const idsIdx = nodes.findIndex((n: types.stmtFlatTreeSit) => n.path.includes(item.path) && n.parsed === "identifier");
    if (!nodes[idsIdx] || nodes[idsIdx].parsed === undefined) return null;

    const name = nodes[idsIdx].id;
    const startpos = nodes[idsIdx].coords.split(" - ")[0];
    const endpos = nodes[idsIdx].coords.split(" - ")[1];
    const datatypes = types.DATATYPE_KEYWORDS;
    let typeNode = nodes[idsIdx + 1];

    if (!datatypes.includes(typeNode.id.toLowerCase())) {
        if (typeKeyword === "function_argument" && typeNode.id.toLowerCase().includes(typeNode.parsed)) {
            typeNode = nodes[idsIdx + 2];
        } else if (typeKeyword === "column_definition") {
            typeNode = nodes[idsIdx + 2];
        } else {
            return null;
        }
    }

    const hasDefault = item.id.toLowerCase().split(" ").findIndex((dlm: string) => dlm === 'default');
    const absoluteDefault = hasDefault >= 0
        ? nodes.findIndex((n: types.stmtFlatTreeSit) => n.path.includes(item.path) && n.parsed.toLowerCase().includes('default'))
        : -1;
    const defaultValue = hasDefault >= 0 && absoluteDefault >= 0 ? nodes[absoluteDefault + 1].id : null;

    return { relation, name, typeNode, defaultValue, startpos, endpos };
}

/**
 * Inserts table column metadata into the database from flattened statement nodes.
 */
async function _insertTableColumns(client: Client, nodes: types.flattenedStmts, file_path: string) {
    logger.log("Inserting table columns into database...");
    const columns = await _collectNodes(nodes, "column_definition");
    if (!columns) return;
    const relations = await _collectNodes(nodes, "object_reference");
    if (!relations) return;

    for (const col of columns) {
        const meta = extractNodeMeta(col, nodes, relations, "column_definition");
        if (!meta) {
            logger.log(`No identifier child found for column definition: ${col}`);
            continue;
        }
        const { relation, name: colName, typeNode, defaultValue, startpos, endpos } = meta;
        const hasNotNull = (col.id.toLowerCase().includes("not") && col.id.toLowerCase().includes("null"));

        logger.log('Done generating column metadata, inserting into database...');
        if (!col.path.includes("create_function")) {
            try {
                let g = await client.query(
                    tableInsertText,
                    ["public", relation, colName, typeNode.id, hasNotNull, defaultValue, col.id, startpos, endpos, file_path]
                );
                logger.log(`Inserted column ${colName} for table ${relation}: ${JSON.stringify(g)}`);
            } catch (e: any) {
                logger.log(`Error inserting column ${colName} for table ${relation}: ${e}`);
            }
        } else {
            logger.log(`Skipping column ${colName} for function ${relation} as it is not a table column.`);
        }
    }
}

/**
 * Inserts function argument metadata into the database from flattened statement nodes.
 */
async function _insertFunctionColumns(client: Client, nodes: types.flattenedStmts, file_path: string) {
    logger.log("Inserting function arguments into database...");
    const args = await _collectNodes(nodes, "function_argument");
    if (!args) return;
    const relations = await _collectNodes(nodes, "object_reference");
    if (!relations) return;

    for (const arg of args) {
        const meta = extractNodeMeta(arg, nodes, relations, "function_argument");
        if (!meta) {
            logger.log(`No identifier child found for function argument: ${arg}`);
            continue;
        }
        const { relation, name: argName, typeNode, defaultValue, startpos, endpos } = meta;

        logger.log('Done generating argument metadata, inserting into database...');
        try {
            const g = await client.query(
                functionInsertText,
                [relation, argName, typeNode.id, defaultValue, arg.id, startpos, endpos, file_path]
            );
            logger.log(`Inserted argument ${argName} for function ${relation}: ${JSON.stringify(g)}`);
        } catch (e: any) {
            logger.log(`Error inserting argument ${argName} for function ${relation}: ${e}`);
        }
    }
}