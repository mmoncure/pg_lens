const Parser = require(`tree-sitter`);
const SQL    = require(`@derekstride/tree-sitter-sql`);
const fs = require('fs')
const pg = require('pg');
const { start } = require('repl');

require('dotenv').config()

const parser = new Parser();
parser.setLanguage(SQL);


const client = new pg.Client({
	user: process.env.PG_USER,
	password: process.env.PG_PASS,
	host: process.env.PG_HOST,
	port: 5432,
	database: process.env.DB_NAME,
})


const source = fs.readFileSync('server/src/in/sampleComplex2.sql').toString()
// console.log(source)
const tree   = parser.parse(source);

let munchedSQL = {splitstmts:[]}

function jsonify(node, parentObj = null) {
  const { startPosition, endPosition, type, fieldName } = node;
  const coord = `${startPosition.row}:${startPosition.column} - ${endPosition.row}:${endPosition.column}`;
  const name  = fieldName ? `${fieldName}: ` : '';
  const thisObj = {
    coords: coord,
    parsed: `${name}${type}`,
    id: `${node.text.replace(/\n/g, "\\n")}`,
    nextstmt: []
  };

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

function collectNodes(node, predicate, results = []) {
  if (predicate(node)) results.push(node);
  (node.nextstmt || []).forEach(child => collectNodes(child, predicate, results));
  return results;
}

async function insertTableColumns(client, munchedSQL, defaultSchema = 'public') {
	if (!munchedSQL.splitstmts || !munchedSQL.splitstmts.length) return;

	const stmts = munchedSQL.splitstmts[0].nextstmt;
	// console.log(stmts.length)

	// multi-statement handling

	for(const stmtObj of stmts) {

		if (stmtObj.parsed!==';') { // added as its own leaf for some reason... not going to remove from 
									// tree for consistencies sake
			
									// checksums
			const objectRefs = collectNodes(stmtObj, n => n.parsed === 'object_reference');
			if (!objectRefs.length) return;
			const idents = collectNodes(objectRefs[0], n => n.parsed === 'identifier');
			if (!idents.length) return;
			const columns = collectNodes(stmtObj, n => n.parsed === 'column_definition');
			if (!columns.length) return;

			const preInsertDelete = `DELETE FROM "table_columns" WHERE table_schema='public';` // change ASAP

			let pd = await client.query(preInsertDelete)
			// console.log(idents[0].id)

			const insertText = `
				INSERT INTO "table_columns" (table_schema, table_name, column_name, column_type, is_not_null, column_default, stmt, start_position, end_position)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;

			for (const leaf of columns) {
				const children = leaf.nextstmt || [];
				const ids = children.find(n => n.parsed === 'identifier');
				if (!ids) {
					console.warn('No children: ', leaf);
				}
				const colName = ids.id
				const startpos = ids.coords.split(" - ")[0]
				const endpos = ids.coords.split(" - ")[1]

				const datatypes = ['int', 'char', 'varchar', 'decimal', 'timestamp'];

				const typeNode = children.find(n => datatypes.includes(n.parsed.toLowerCase()));
				const colType = typeNode ? typeNode.id : null;
				const hasNotNull = children.some(n => n.parsed === 'keyword_not') && children.some(n => n.parsed === 'keyword_null');
				const defIdx = children.findIndex(n => n.parsed === 'keyword_default');
				const colDefault = defIdx >= 0 && children[defIdx + 1] ? children[defIdx + 1].id : null;
				try {
					let g = await client.query(insertText, [defaultSchema, idents[0].id, colName, colType, hasNotNull, colDefault, stmtObj.id, startpos, endpos]);}
				catch( e) {
					throw e
				}
			}
		}
	}
}

async function main() {
	await client.connect()
	jsonify(tree.rootNode);
	fs.writeFileSync('out.json',JSON.stringify(munchedSQL,null,2))

  // load or build your munchedSQL object however you do:

  await insertTableColumns(client, munchedSQL);
//   console.log('✅  done inserting');

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});