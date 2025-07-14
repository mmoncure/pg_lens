import * as main from './main'
import * as types from '../types'
import * as ParserTS from 'tree-sitter'
import * as SQL from '@derekstride/tree-sitter-sql'
import { nextTick } from 'process';
import * as fs from 'fs'

const parser = new ParserTS();
parser.setLanguage(SQL);

// organized :)

export async function createContext(statement: string) {

	let munchedSQL: types.stmtTreeSit = { // need new instance
		coords: "full",
		parsed: ":)",
		id: ":)",
		nextstmt: [],
	}

	const tree = parser.parse(statement)
	main.jsonify(tree.rootNode,munchedSQL)

	return munchedSQL;
}