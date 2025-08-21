import { log } from 'console';
import * as types from '../types'
import logger from '../util/log';

/**
 * 
 * Searches through flattened statements for a specific target node.
 * 
 * @param data - Flattened statements to search through.
 * @param targetParsed - The parsed type of the target node to find.
 * @param targetId - The ID of the target node to find.
 * @param findId - If true, searches for the parsed type; if false, searches for the ID.
 * @returns A promise that resolves to a search return object containing the found data and its path.
 */
export async function _flattenedSearchSingleTarget(data: types.flattenedStmts, targetParsed: string, targetId: String, findId: boolean = false): Promise<types.searchReturn> {
	if (!data) return {data: false, path: ""};
	// logger.log(`Searching for targetParsed: ${targetParsed}, targetId: ${targetId}, findId: ${findId}`);
	for (let i = 0; i < data.length; i++) {
		const node = data[i]
		if (findId) {
			if (node.parsed.toLowerCase() === targetParsed.toLowerCase()) {
				return {
					data: node.id,
					path: node.path
				}
			}
		}
		else {
			if (((node.id.toLowerCase() === targetId.toLowerCase())) && node.parsed.toLowerCase() === targetParsed.toLowerCase()) {
				return {
					data: true, 
					path: node.path}
			}
		}
	}
	// console.log('nothing found')
	logger.log(`No match found for targetParsed: ${targetParsed}, targetId: ${targetId}, findId: ${findId}`);
	return {
		data: false,
		path: ""
	}
}

export async function _flattenedSearchMultiTarget(data: types.flattenedStmts, targetParsed: string = '', targetId: string = '', match: 'parsed' | 'id' | 'both'): Promise<types.multiSearchReturn> {
	logger.log(`Searching for multiple targets with targetParsed: ${targetParsed}, targetId: ${targetId}, match: ${match}`);
	const hits: types.multiSearchReturn = [];
	if (!data) return [{data: hits, path: ""}];

	for (var queue = 0; queue < data.length; queue++) {
		// logger.log(`Checking node ${queue + 1}/${data.length}`);
		const node = data[queue]
		if (match === 'both') {
			if ((node?.id.toLowerCase() === targetId.toLowerCase()) && node?.parsed.toLowerCase() === targetParsed.toLowerCase()) {
				hits.push({data: node, path: node.path})
			}
		}
		else if (match === 'parsed') {
			if (node?.parsed.toLowerCase() === targetParsed.toLowerCase()) {
				hits.push({data: node, path: node.path})
			}
		}
		else {
			if (node?.id.toLowerCase() === targetId.toLowerCase()) {
				hits.push({data: node, path: node.path})
			}
		}
	}
	logger.log(`Multi-target search found ${hits.length} hits for targetParsed: ${targetParsed}, targetId: ${targetId}, match: ${match}`);
	return hits;
}