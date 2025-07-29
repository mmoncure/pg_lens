import * as main from './main'
import * as ParserTS from 'tree-sitter'
import * as SQL from '@derekstride/tree-sitter-sql'
import * as types from './types'
import * as fs from 'fs'

const parser = new ParserTS();
parser.setLanguage(SQL);

async function m() {

	const tree = parser.parse(`
		SELECT * from awesome.dog WHERE cat=5;	
	`);

	const retval: types.flattenedStmts = []

	await main.dfsFlatten(tree.rootNode,"",retval)

	fs.writeFileSync('./test.json', JSON.stringify(retval,null,2))

	retval.forEach((i, idx) => {
		console.log(i)
	})

}

m()