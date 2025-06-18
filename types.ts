import { ParseResult, RawStmt } from 'libpg-query'

type stmtObj = {
	stmt: object | undefined,
	stmt_location: number | undefined,
	stmt_len: number | undefined,
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
}