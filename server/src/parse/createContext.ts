import * as main from './main'
import * as types from '../types'
import * as ParserTS from 'tree-sitter'
import * as SQL from '@derekstride/tree-sitter-sql'
import { nextTick } from 'process';
import * as fs from 'fs'
import { Client, PoolClient } from 'pg';

const parser = new ParserTS();
parser.setLanguage(SQL);

// organized :)

// const preInsertDelete = `DELETE FROM "table_columns" WHERE table_schema='public'` // change ASAP

export async function createContext(statement: string, client: PoolClient) {

	let munchedSQL: types.stmtTreeSit = { // need new instance
		coords: "0:0-0:0",
		parsed: ":)",
		id: ":)",
		nextstmt: [],
	}
	const tree = parser.parse(statement)

	await main.jsonify(tree.rootNode,munchedSQL)

	return munchedSQL;
}