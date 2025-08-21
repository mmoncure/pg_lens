import * as types from '../types'
import logger from '../util/log';
import { TextDocument, Position } from 'vscode-languageserver-textdocument'; // very useful, leaving in

/**
 * 
 * Extracts semantic highlights from flattened statements.
 * 
 * @param data - Flattened statements to search through.
 * @param doc - The text document containing the SQL code. 
 * @returns A promise that resolves to an array of highlight data objects.
 */
export async function _flatHighlights(data: types.flattenedStmts, doc: TextDocument): Promise<types.highlightReturn> {

	logger.log("Extracting semantic highlights...")
	const ret: types.highlightReturn = [];

	for (let i = 0; i < data.length; i++) {

		let n = data[i]

		if (n.parsed.includes("marginalia") || n.parsed.includes("comment") || n.parsed.includes("keyword") || n.parsed.includes("identifier") || n.parsed.includes("literal")) { // ensures we only look at nodes we want to color
			// logger.log(`Processing node for highlights: ${JSON.stringify(n)}`);
			const fancystart = (n.coords.split("-"))[0].split(":")
			const fancyend = (n.coords.split("-"))[1].split(":")
			const start: Position = { line: parseInt(fancystart[0]), character: parseInt(fancystart[1]) }
			const end: Position = { line: parseInt(fancyend[0]), character: parseInt(fancyend[1]) }
			
			const length = doc.offsetAt(end) - doc.offsetAt(start)
			let type = 0;

			for (let i = 0; i < types.DATATYPE_KEYWORDS.length; i++) {
				if (n.parsed.includes(types.DATATYPE_KEYWORDS[i])) {
					// console.log(n.parsed)
					type = types.tokenTypes.indexOf("type")
					// console.log(type)
					break;
				}
			}
			if (type !== 0) {
				// do nothing, im not sure how to properly do this lol
			}
			else if (n.parsed.includes('keyword')) {
				type = types.tokenTypes.indexOf("keyword")
			}
			else if (n.parsed.includes('identifier')) {
				type = types.tokenTypes.indexOf("identifier")
			}
			else if (n.parsed.includes('literal')) {
				if (isNaN(parseInt(n.id)) && isNaN(parseFloat(n.id))) {
					type = types.tokenTypes.indexOf("literalStr")
				}
				else type = types.tokenTypes.indexOf("literalNum")
			}
			else if (n.parsed.includes('comment') || n.parsed.includes("marginalia")) {
				// console.log("start: ", start, "\nend: ", end)
				type = types.tokenTypes.indexOf('comment')
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
			catch(e) {
				logger.log(`Error processing node for highlights: ${e}`);
			}

		}
	}
	logger.log(`Semantic highlights extracted: ${JSON.stringify(ret)}`);
	return ret
}