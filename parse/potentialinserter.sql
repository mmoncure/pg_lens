CREATE TABLE column
(
  table_schema TEXT, 
  table_name TEXT,
  column_name TEXT,
  column_type TEXT,
  PRIMARY KEY(table_schema, table_name, column_name),
  statement TEXT,
  filename TEXT,
  start_position INT,
  length INT
);


CREATE OR REPLACE FUNCTION parse_this(
  _statement_kind TEXT,
  _filename TEXT,
  _start_position INT,
  _length INT,
  _j JSON) RETURNS VOID AS
$$
BEGIN
  	IF _statement_kind = 'CREATE'

  	WITH cols AS SELECT * FROM json_array_elements(
    	select c->'ColumnDef'->>'colname' AS colname, c->'ColumnDef'->'typeName'->'names'->0->'String'->>'sval' as type_name from (  select jsonb_array_elements(j->'statements'->0->'stmt'->'CreateStmt'->'tableElts') as c from _j) q;
	)
    -- /* alias columns */
--   INSERT INTO column ..
--   SELECT * FROM json_populate_records(NULL::column, j)
END;
  
$$ LANGUAGE PLPGSQL;


SELECT parse_this($$
{
  CreateStmt: {
    relation: {
      relname: 'customers',
      inh: true,
      relpersistence: 'p',
      location: 32
    },
    tableElts: [
      {
        ColumnDef: {
          colname: 'customerid',
          typeName: {
            names: [
              { String: { sval: 'pg_catalog' } },
              { String: { sval: 'int4' } }
            ],
            typemod: -1,
            location: 59
          },
          is_local: true,
          constraints: [
            { Constraint: { contype: 'CONSTR_PRIMARY', location: 63 } }
          ],
          location: 48
        }
      },
      {
        ColumnDef: {
          colname: 'firstname',
          typeName: {
            names: [
              { String: { sval: 'pg_catalog' } },
              { String: { sval: 'varchar' } }
            ],
            typmods: [
              { A_Const: { ival: { ival: 50 }, location: 98 } }
            ],
            typemod: -1,
            location: 90
          },
          is_local: true,
          location: 80
        }
      },
      {
        ColumnDef: {
          colname: 'lastname',
          typeName: {
            names: [
              { String: { sval: 'pg_catalog' } },
              { String: { sval: 'varchar' } }
            ],
            typmods: [
              { A_Const: { ival: { ival: 50 }, location: 124 } }
            ],
            typemod: -1,
            location: 116
          },
          is_local: true,
          location: 107
        }
      },
      {
        ColumnDef: {
          colname: 'email',
          typeName: {
            names: [
              { String: { sval: 'pg_catalog' } },
              { String: { sval: 'varchar' } }
            ],
            typmods: [
              { A_Const: { ival: { ival: 100 }, location: 147 } }
            ],
            typemod: -1,
            location: 139
          },
          is_local: true,
          constraints: [
            { Constraint: { contype: 'CONSTR_UNIQUE', location: 152 } }
          ],
          location: 133
        }
      },
      {
        ColumnDef: {
          colname: 'registereddate',
          typeName: {
            names: [ { String: { sval: 'date' } } ],
            typemod: -1,
            location: 179
          },
          is_local: true,
          constraints: [
            {
              Constraint: {
                contype: 'CONSTR_DEFAULT',
                raw_expr: {
                  SQLValueFunction: {
                    op: 'SVFOP_CURRENT_DATE',
                    typmod: -1,
                    location: 192
                  }
                },
                location: 184
              }
            }
          ],
          location: 164
        }
      }
    ],
    oncommit: 'ONCOMMIT_NOOP'
  }
}$$::JSON;