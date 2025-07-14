import { ParseResult, RawStmt } from 'libpg-query'

// New (treesitter)

type stmtTreeSit = {
	coords: string,
    parsed: string,
    id: string,
    nextstmt: stmtTreeSit[],
}

type stmtCompletionData = {
	tablename: string,
	cols:
		{
			col: string,
			extradata: string,
		}[]
}

type stmtsTreeSit = {
	statements: stmtTreeSit[] | null
}

// OLD (libpg-query attempt)

type stmtObj = {
	stmt: object | undefined,
	stmt_location: number | undefined,
	stmt_len: number | undefined,
	stmt_start: number | undefined,
	stmt_endlocation: number | undefined,
	error: boolean,
	reason: string | undefined,
}

type stmtArr = {
	statements: stmtObj[],
	psql: string[]
}

type pAndSql = {
	sql: string,
	psql: string[],
}

export {
	pAndSql,
	stmtObj,
	stmtArr,
	stmtTreeSit,
	stmtsTreeSit,
	stmtCompletionData
}