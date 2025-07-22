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

// Flat list (all lowercase)
export const DATATYPE_KEYWORDS: string[] = [
  'keyword_int',
  'keyword_null',
  'keyword_boolean',
  'keyword_binary',
  'keyword_varbinary',
  'keyword_image',
  'keyword_bit',
  'keyword_inet',
  'keyword_character',
  'keyword_smallserial',
  'keyword_serial',
  'keyword_bigserial',
  'keyword_smallint',
  'keyword_mediumint',
  'keyword_bigint',
  'keyword_tinyint',
  'keyword_decimal',
  'keyword_float',
  'keyword_double',
  'keyword_numeric',
  'keyword_real',
  'double',                 // literal node name in your list
  'keyword_money',
  'keyword_smallmoney',
  'keyword_char',
  'keyword_nchar',
  'keyword_varchar',
  'keyword_nvarchar',
  'keyword_varying',
  'keyword_text',
  'keyword_string',
  'keyword_uuid',
  'keyword_json',
  'keyword_jsonb',
  'keyword_xml',
  'keyword_bytea',
  'keyword_enum',
  'keyword_date',
  'keyword_datetime',
  'keyword_time',
  'keyword_datetime2',
  'keyword_datetimeoffset',
  'keyword_smalldatetime',
  'keyword_timestamp',
  'keyword_timestamptz',
  'keyword_geometry',
  'keyword_geography',
  'keyword_box2d',
  'keyword_box3d',
  'keyword_interval',

  'int',
  'null',
  'boolean',
  'binary',
  'varbinary',
  'image',
  'bit',
  'inet',
  'character',
  'smallserial',
  'serial',
  'bigserial',
  'smallint',
  'mediumint',
  'bigint',
  'tinyint',
  'decimal',
  'float',
  'double',
  'numeric',
  'real',
  'money',
  'smallmoney',
  'char',
  'nchar',
  'varchar',
  'nvarchar',
  'varying',
  'text',
  'string',
  'uuid',
  'json',
  'jsonb',
  'xml',
  'bytea',
  'enum',
  'date',
  'datetime',
  'time',
  'datetime2',
  'datetimeoffset',
  'smalldatetime',
  'timestamp',
  'timestamptz',
  'geometry',
  'geography',
  'box2d',
  'box3d',
  'interval'
] as const;


export const TYPE_ALIASES: Record<string, string[]> = {
  smallint: ['smallint','int2','serial2','smallserial'],
  integer:  ['integer','int','int4','serial','serial4'],
  bigint:   ['bigint','int8','bigserial','serial8'],

  numeric:  ['numeric','decimal','dec'],
  real:     ['real','float4'],
  'double precision': ['double precision','float8'],

  boolean:  ['boolean','bool'],

  char:     ['char','character','bpchar'],
  varchar:  ['varchar','character varying'],
  text:     ['text','citext'],

  date:     ['date'],
  time:     ['time','time without time zone','timetz','time with time zone'],
  timestamp:['timestamp','timestamp without time zone',
             'timestamptz','timestamp with time zone'],
  interval: ['interval'],

  bytea:    ['bytea'],
  bit:      ['bit','bit varying','varbit'],

  json:     ['json','jsonb'],
  xml:      ['xml'],

  uuid:     ['uuid'],

  cidr:     ['cidr'],
  inet:     ['inet'],
  macaddr:  ['macaddr','macaddr8'],

  // geo
  point:    ['point'],
  line:     ['line'],
  lseg:     ['lseg'],
  box:      ['box'],
  path:     ['path'],
  polygon:  ['polygon'],
  circle:   ['circle'],

  tsvector: ['tsvector'],
  tsquery:  ['tsquery'],

  // ranges
  int4range:['int4range'],
  int8range:['int8range'],
  numrange: ['numrange'],
  tsrange:  ['tsrange'],
  tstzrange:['tstzrange'],
  daterange:['daterange'],

  // misc
  oid:           ['oid'],
  regclass:      ['regclass'],
  regtype:       ['regtype'],
  regproc:       ['regproc','regprocedure'],
  regoper:       ['regoper','regoperator'],
  regconfig:     ['regconfig'],
  regdictionary: ['regdictionary'],
  pg_lsn:        ['pg_lsn'],
  txid_snapshot: ['txid_snapshot','pg_snapshot']
};


export {
	pAndSql,
	stmtObj,
	stmtArr,
	stmtTreeSit,
	stmtsTreeSit,
	stmtCompletionData,
}