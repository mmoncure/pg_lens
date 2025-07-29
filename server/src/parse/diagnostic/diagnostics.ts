import * as types from '../types'
import { Position } from 'vscode-languageserver-textdocument'; // very useful, leaving in
import { _flattenedSearchMultiTarget } from '../util/search'
import * as ParserTS from 'tree-sitter'
import * as SQL from '@derekstride/tree-sitter-sql'
 
const DiagnosticSeverity = {
	Error: 1,
	Hint: 4,
	Information: 3,
	Warning: 2
}

export function _flatDiagnostics(root: types.flattenedStmts): types.diagnosticReturn {

	const hits: types.diagnosticReturn = []

	if (!root) hits;

	const errors = (_flattenedSearchMultiTarget(root, "ERROR", "", 'parsed'))

	for (var i = 0; i < errors.length; i++) {
		const fancystart = (errors[i].data.coords.split("-"))[0].split(":")
		const fancyend = (errors[i].data.coords.split("-"))[1].split(":")
		const start: Position = { line: parseInt(fancystart[0]), character: parseInt(fancystart[1]) }
		const end: Position = { line: parseInt(fancyend[0]), character: parseInt(fancyend[1]) }
		hits.push({
			severity: DiagnosticSeverity.Error,
			range: {
				start: start,
				end: end,
			},
			message: `Our parsing does not permit more in depth error checking`, // maybe find more in depth error reporting?
			source: '\n\nIt is recommended to check out the docs: https://www.postgresql.org/docs/current/sql.html'
		});
	}
	return hits
}