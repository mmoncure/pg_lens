import * as types from '../types'
import * as ParserTS from 'tree-sitter'
import * as SQL from '@derekstride/tree-sitter-sql'

export async function _flattenedSearchSingleTarget(data: types.flattenedStmts, targetParsed: string, targetId: String, findId: boolean = false): Promise<types.searchReturn> {
	// console.log(targetParsed, " ", targetId, " ",  findId)
	// console.log (data)
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
	return {
		data: false,
		path: ""
	}
}

export async function _flattenedSearchMultiTarget(data: types.flattenedStmts, targetParsed: string = '', targetId: string = '', match: 'parsed' | 'id' | 'both'): Promise<types.multiSearchReturn> {
	const hits: types.multiSearchReturn = [];
	if (!data) return [{data: hits, path: ""}];

	for (var queue = 0; queue < data.length; queue++) {
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
	return hits;
}