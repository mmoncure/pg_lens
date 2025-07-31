import * as types from '../types'
import { TextDocument, Position } from 'vscode-languageserver-textdocument'; // very useful, leaving in
import * as ParserTS from 'tree-sitter'
import * as SQL from '@derekstride/tree-sitter-sql'

export const tokenTypes = [
	'namespace', 'type', 'class', 'enum', 'interface', 'struct', 'typeParameter',
	'parameter', 'variable', 'keyword', 'enumMember', 'event', 'function', 'method',
	'macro', 'label', 'comment', 'literalStr', 'identifier', 'literalNum', 'regexp', 'operator'
] as const; // Most of the color types, this is a copy of the original list from server.ts, but with changes to specific ones to make it easier to read in use, index matters, the word does not.

export async function _flatHighlights(data: types.flattenedStmts, doc: TextDocument): Promise<types.highlightReturn> {

	const ret: types.highlightReturn = [];

	for (let i = 0; i < data.length; i++) {

		let n = data[i]

		if (n.parsed.includes("marginalia") || n.parsed.includes("comment") || n.parsed.includes("keyword") || n.parsed.includes("identifier") || n.parsed.includes("literal")) { // ensures we only look at nodes we want to color

			const fancystart = (n.coords.split("-"))[0].split(":")
			const fancyend = (n.coords.split("-"))[1].split(":")
			const start: Position = { line: parseInt(fancystart[0]), character: parseInt(fancystart[1]) }
			const end: Position = { line: parseInt(fancyend[0]), character: parseInt(fancyend[1]) }
			
			const length = doc.offsetAt(end) - doc.offsetAt(start)
			let type = 0;

			if (n.parsed.includes('keyword')) {
				type = tokenTypes.indexOf("keyword")
			}
			else if (n.parsed.includes('identifier')) {
				type = tokenTypes.indexOf("identifier")
			}
			else if (n.parsed.includes('literal')) {
				if (isNaN(parseInt(n.id)) && isNaN(parseFloat(n.id))) {
					type = tokenTypes.indexOf("literalStr")
				}
				else type = tokenTypes.indexOf("literalNum")
			}
			else if (n.parsed.includes('comment') || n.parsed.includes("marginalia")) {
				// console.log("start: ", start, "\nend: ", end)
				type = tokenTypes.indexOf('comment')
			}
			/*
				stl: start.line,
				stc: start.character,
				len: length,
				typ: type,
				dum: 0
			*/

			let marSplit = n.id.split('\\n');
			try {
			if (n.parsed.includes('marginalia') && marSplit.length != 1) {
				// console.log(n.id)
				// console.log(marSplit)
				// console.log(marSplit[i])
				for (let i = 0; i < (marSplit.length); i++) {
					ret.push({
						stl: start.line + i,
						stc: i == 0 ? start.character : 0,
						len: marSplit[i].length,
						typ:  type,
						dum: 0
					})
				}
			} 
			else {
				ret.push({
					stl: start.line,
					stc: start.character,
					len: length,
					typ:  type,
					dum: 0
				})
			}
			}
			catch(e) { console.log(e) }

		}
	}
	return ret
}