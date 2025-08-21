import * as main from './main'
import * as ParserTS from 'tree-sitter'
import * as SQL from '@maximjov/tree-sitter-sql'
import * as types from './types'
import * as fs from 'fs'
import * as pg from 'pg'

// const parser = new ParserTS();
// parser.setLanguage(SQL);

const client = new pg.Client({
	host: 'localhost',
	port: 5432,
	password: 'admin',
	database: 'postgres',
	user: 'postgres',
})



async function m() {
	console.log("Connecting to database...")

	await client.query('BEGIN')
	let v = await client.query(`insert into table_columns (dog) values ('cat') returning *;`)
	await client.query('COMMIT')

	console.log(v)

	// const tree = parser.parse(`
	// 	SELECT * from awesome.dog WHERE cat=5;	
	// `);

	// const retval: types.flattenedStmts = []

	// await main.dfsFlatten(tree.rootNode,"",retval)

	// fs.writeFileSync('./test.json', JSON.stringify(retval,null,2))

	// retval.forEach((i, idx) => {
	// 	console.log(i)
	// })

}

m()