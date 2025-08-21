import * as types from '../types'
import logger from '../util/log';
import { Position } from 'vscode-languageserver-textdocument'; // very useful, leaving in
import { _flattenedSearchMultiTarget } from '../util/search'
 
const DiagnosticSeverity = {
	Error: 1,
	Hint: 4,
	Information: 3,
	Warning: 2
}

/**
 * 
 * Extracts diagnostics from flattened statements.
 * 
 * @param root - Flattened statements to search through.
 * @returns A promise that resolves to an array of diagnostic data objects.
 */
export async function _flatDiagnostics(root: types.flattenedStmts): Promise<types.diagnosticReturn> {
	logger.log("Extracting diagnostics...")
	const hits: types.diagnosticReturn = []

	if (!root) hits;
	// logger.log("Searching for errors in flattened statements...")
	const errors = await (_flattenedSearchMultiTarget(root, "ERROR", "", 'parsed'))
	// console.log(errors)
	for (var i = 0; i < errors.length; i++) {
		const fancystart = (errors[i].data.coords.split("-"))[0].split(":")
		const fancyend = (errors[i].data.coords.split("-"))[1].split(":")
		const start: Position = { line: parseInt(fancystart[0]), character: parseInt(fancystart[1]) }
		const end: Position = { line: parseInt(fancyend[0]), character: parseInt(fancyend[1]) }
		// console.log(errors[i].data.id.toLowerCase(), "\n\n")
		// console.log('f')
		if (!errors[i].data.path.toLowerCase().includes("function")) {
			// console.log("TRUE")
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
	}
	logger.log(`Diagnostics extracted: ${JSON.stringify(hits)}`);
	return hits
}