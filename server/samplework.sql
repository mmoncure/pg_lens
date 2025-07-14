DROP FUNCTION IF EXISTS table_columns;
DROP FUNCTION IF EXISTS constr_foreign;
DROP FUNCTION IF EXISTS constr_primary;
DROP FUNCTION IF EXISTS constr_unique;

DROP TABLE IF EXISTS j;

CREATE TEMP TABLE j AS
  SELECT $${
  "statements": [
    {
      "stmt": {
        "CreateStmt": {
          "relation": {
            "schemaname": "public",
            "relname": "events",
            "inh": true,
            "relpersistence": "t",
            "location": 37
          },
          "tableElts": [
            {
              "ColumnDef": {
                "colname": "event_id",
                "typeName": {
                  "names": [
                    {
                      "String": {
                        "sval": "serial"
                      }
                    }
                  ],
                  "typemod": -1,
                  "location": 83
                },
                "is_local": true,
                "constraints": [
                  {
                    "Constraint": {
                      "contype": "CONSTR_NOTNULL",
                      "location": 110
                    }
                  }
                ],
                "location": 68
              }
            },
            {
              "ColumnDef": {
                "colname": "event_name",
                "typeName": {
                  "names": [
                    {
                      "String": {
                        "sval": "text"
                      }
                    }
                  ],
                  "typemod": -1,
                  "location": 137
                },
                "is_local": true,
                "collClause": {
                  "collname": [
                    {
                      "String": {
                        "sval": "en_US"
                      }
                    }
                  ],
                  "location": 142
                },
                "constraints": [
                  {
                    "Constraint": {
                      "contype": "CONSTR_NOTNULL",
                      "location": 164
                    }
                  }
                ],
                "location": 122
              }
            },
            {
              "ColumnDef": {
                "colname": "organizer_id",
                "typeName": {
                  "names": [
                    {
                      "String": {
                        "sval": "pg_catalog"
                      }
                    },
                    {
                      "String": {
                        "sval": "int4"
                      }
                    }
                  ],
                  "typemod": -1,
                  "location": 191
                },
                "is_local": true,
                "constraints": [
                  {
                    "Constraint": {
                      "contype": "CONSTR_DEFAULT",
                      "raw_expr": {
                        "A_Const": {
                          "ival": {},
                          "location": 207
                        }
                      },
                      "location": 199
                    }
                  },
                  {
                    "Constraint": {
                      "contype": "CONSTR_NOTNULL",
                      "location": 218
                    }
                  }
                ],
                "location": 176
              }
            },
            {
              "ColumnDef": {
                "colname": "location",
                "typeName": {
                  "names": [
                    {
                      "String": {
                        "sval": "text"
                      }
                    }
                  ],
                  "typemod": -1,
                  "location": 245
                },
                "is_local": true,
                "constraints": [
                  {
                    "Constraint": {
                      "contype": "CONSTR_DEFAULT",
                      "raw_expr": {
                        "A_Const": {
                          "sval": {
                            "sval": "TBD"
                          },
                          "location": 262
                        }
                      },
                      "location": 254
                    }
                  }
                ],
                "location": 230
              }
            },
            {
              "ColumnDef": {
                "colname": "start_time",
                "typeName": {
                  "names": [
                    {
                      "String": {
                        "sval": "timestamptz"
                      }
                    }
                  ],
                  "typemod": -1,
                  "location": 286
                },
                "is_local": true,
                "constraints": [
                  {
                    "Constraint": {
                      "contype": "CONSTR_NOTNULL",
                      "location": 313
                    }
                  }
                ],
                "location": 271
              }
            },
            {
              "ColumnDef": {
                "colname": "end_time",
                "typeName": {
                  "names": [
                    {
                      "String": {
                        "sval": "timestamptz"
                      }
                    }
                  ],
                  "typemod": -1,
                  "location": 340
                },
                "is_local": true,
                "constraints": [
                  {
                    "Constraint": {
                      "contype": "CONSTR_NOTNULL",
                      "location": 367
                    }
                  }
                ],
                "location": 325
              }
            },
            {
              "ColumnDef": {
                "colname": "is_virtual",
                "typeName": {
                  "names": [
                    {
                      "String": {
                        "sval": "pg_catalog"
                      }
                    },
                    {
                      "String": {
                        "sval": "bool"
                      }
                    }
                  ],
                  "typemod": -1,
                  "location": 394
                },
                "is_local": true,
                "constraints": [
                  {
                    "Constraint": {
                      "contype": "CONSTR_DEFAULT",
                      "raw_expr": {
                        "A_Const": {
                          "boolval": {},
                          "location": 410
                        }
                      },
                      "location": 402
                    }
                  }
                ],
                "location": 379
              }
            },
            {
              "ColumnDef": {
                "colname": "capacity",
                "typeName": {
                  "names": [
                    {
                      "String": {
                        "sval": "pg_catalog"
                      }
                    },
                    {
                      "String": {
                        "sval": "int4"
                      }
                    }
                  ],
                  "typemod": -1,
                  "location": 434
                },
                "is_local": true,
                "location": 419
              }
            },
            {
              "Constraint": {
                "contype": "CONSTR_PRIMARY",
                "conname": "pk_events",
                "keys": [
                  {
                    "String": {
                      "sval": "event_id"
                    }
                  }
                ],
                "location": 472
              }
            },
            {
              "Constraint": {
                "contype": "CONSTR_UNIQUE",
                "conname": "uq_event_name",
                "keys": [
                  {
                    "String": {
                      "sval": "event_name"
                    }
                  }
                ],
                "location": 531
              }
            },
            {
              "Constraint": {
                "contype": "CONSTR_FOREIGN",
                "conname": "fk_events_organizer",
                "initially_valid": true,
                "pktable": {
                  "schemaname": "public",
                  "relname": "users",
                  "inh": true,
                  "relpersistence": "p",
                  "location": 666
                },
                "fk_attrs": [
                  {
                    "String": {
                      "sval": "organizer_id"
                    }
                  }
                ],
                "pk_attrs": [
                  {
                    "String": {
                      "sval": "user_id"
                    }
                  }
                ],
                "fk_matchtype": "s",
                "fk_upd_action": "c",
                "fk_del_action": "n",
                "location": 591
              }
            },
            {
              "Constraint": {
                "contype": "CONSTR_CHECK",
                "conname": "chk_duration",
                "initially_valid": true,
                "raw_expr": {
                  "A_Expr": {
                    "kind": "AEXPR_OP",
                    "name": [
                      {
                        "String": {
                          "sval": ">"
                        }
                      }
                    ],
                    "lexpr": {
                      "ColumnRef": {
                        "fields": [
                          {
                            "String": {
                              "sval": "end_time"
                            }
                          }
                        ],
                        "location": 781
                      }
                    },
                    "rexpr": {
                      "ColumnRef": {
                        "fields": [
                          {
                            "String": {
                              "sval": "start_time"
                            }
                          }
                        ],
                        "location": 792
                      }
                    },
                    "location": 790
                  }
                },
                "location": 736
              }
            },
			{
              "Constraint": {
                "contype": "CONSTR_CHECK",
                "conname": "chk_duration1",
                "initially_valid": true,
                "raw_expr": {
                  "A_Expr": {
                    "kind": "AEXPR_OP",
                    "name": [
                      {
                        "String": {
                          "sval": ">"
                        }
                      }
                    ],
                    "lexpr": {
                      "ColumnRef": {
                        "fields": [
                          {
                            "String": {
                              "sval": "end_time"
                            }
                          }
                        ],
                        "location": 781
                      }
                    },
                    "rexpr": {
                      "ColumnRef": {
                        "fields": [
                          {
                            "String": {
                              "sval": "start_time"
                            }
                          }
                        ],
                        "location": 792
                      }
                    },
                    "location": 790
                  }
                },
                "location": 736
              }
            },
            {
              "Constraint": {
                "contype": "CONSTR_CHECK",
                "conname": "chk_capacity",
                "initially_valid": true,
                "raw_expr": {
                  "BoolExpr": {
                    "boolop": "AND_EXPR",
                    "args": [
                      {
                        "A_Expr": {
                          "kind": "AEXPR_OP",
                          "name": [
                            {
                              "String": {
                                "sval": ">"
                              }
                            }
                          ],
                          "lexpr": {
                            "ColumnRef": {
                              "fields": [
                                {
                                  "String": {
                                    "sval": "capacity"
                                  }
                                }
                              ],
                              "location": 852
                            }
                          },
                          "rexpr": {
                            "A_Const": {
                              "ival": {},
                              "location": 863
                            }
                          },
                          "location": 861
                        }
                      },
                      {
                        "A_Expr": {
                          "kind": "AEXPR_OP",
                          "name": [
                            {
                              "String": {
                                "sval": "="
                              }
                            }
                          ],
                          "lexpr": {
                            "ColumnRef": {
                              "fields": [
                                {
                                  "String": {
                                    "sval": "location"
                                  }
                                }
                              ],
                              "location": 869
                            }
                          },
                          "rexpr": {
                            "A_Const": {
                              "sval": {
                                "sval": "dogtown"
                              },
                              "location": 878
                            }
                          },
                          "location": 877
                        }
                      }
                    ],
                    "location": 865
                  }
                },
                "location": 807
              }
            },
            {
              "Constraint": {
                "contype": "CONSTR_EXCLUSION",
                "conname": "ex_no_overlap",
                "exclusions": [
                  {
                    "List": {
                      "items": [
                        {
                          "IndexElem": {
                            "expr": {
                              "FuncCall": {
                                "funcname": [
                                  {
                                    "String": {
                                      "sval": "tsrange"
                                    }
                                  }
                                ],
                                "args": [
                                  {
                                    "ColumnRef": {
                                      "fields": [
                                        {
                                          "String": {
                                            "sval": "start_time"
                                          }
                                        }
                                      ],
                                      "location": 958
                                    }
                                  },
                                  {
                                    "ColumnRef": {
                                      "fields": [
                                        {
                                          "String": {
                                            "sval": "end_time"
                                          }
                                        }
                                      ],
                                      "location": 970
                                    }
                                  }
                                ],
                                "funcformat": "COERCE_EXPLICIT_CALL",
                                "location": 950
                              }
                            },
                            "ordering": "SORTBY_DEFAULT",
                            "nulls_ordering": "SORTBY_NULLS_DEFAULT"
                          }
                        },
                        {
                          "List": {
                            "items": [
                              {
                                "String": {
                                  "sval": "&&"
                                }
                              }
                            ]
                          }
                        }
                      ]
                    }
                  }
                ],
                "access_method": "gist",
                "location": 892
              }
            }
          ],
          "inhRelations": [
            {
              "RangeVar": {
                "schemaname": "public",
                "relname": "base_events",
                "inh": true,
                "relpersistence": "p",
                "location": 1002
              }
            }
          ],
          "partspec": {
            "strategy": "PARTITION_STRATEGY_RANGE",
            "partParams": [
              {
                "PartitionElem": {
                  "name": "start_time",
                  "location": 1081
                }
              }
            ],
            "location": 1061
          },
          "options": [
            {
              "DefElem": {
                "defname": "autovacuum_enabled",
                "arg": {
                  "String": {
                    "sval": "true"
                  }
                },
                "defaction": "DEFELEM_UNSPEC",
                "location": 1140
              }
            },
            {
              "DefElem": {
                "defnamespace": "toast",
                "defname": "autovacuum_enabled",
                "arg": {
                  "String": {
                    "sval": "false"
                  }
                },
                "defaction": "DEFELEM_UNSPEC",
                "location": 1174
              }
            }
          ],
          "oncommit": "ONCOMMIT_NOOP",
          "tablespacename": "fast_space",
          "if_not_exists": true
        }
      },
      "stmt_len": 1228,
      "stmt_location": 0,
      "error": false
    }
  ],
  "psql": []
}$$::JSONB AS j;


CREATE OR REPLACE FUNCTION table_columns(
	  _json JSONB,
	  column_name OUT TEXT,
	  type_name OUT TEXT,
	  type_mod OUT TEXT
  ) RETURNS SETOF RECORD AS
$$
BEGIN
  RETURN QUERY SELECT
    col->'ColumnDef'->>'colname',
    col->'ColumnDef'->'typeName'->'names'->0->'String'->>'sval',
	col->'ColumnDef'->'typeName'->>'typemod'
  FROM 
  (
    SELECT 
      jsonb_array_elements(
        _json->'statements'->0->'stmt'->'CreateStmt'->'tableElts') AS col
  ) q
  WHERE col->'ColumnDef' IS NOT NULL;
END;
$$ LANGUAGE PLPGSQL;

-- SELECT* FROM table_columns((select j from j));

/* 
  SELECT* FROM table_columns((select j from j));


  1. return list of constraints ( FUNCTION table_constraints, returns, name and type)
  2. for for foreign keys,return columsn FUNCTION foreign_key_columns -> column_name

"contype": "CONSTR_FOREIGN", convert out list of "sval": "<columns>"
CREATE OR REPLACE FUNCTION table_foreign_keys(
*/


CREATE OR REPLACE FUNCTION constr_foreign(
	  _json JSONB,
	  conname OUT TEXT,
	  fk_attrs OUT TEXT[],
	  pk_attrs OUT TEXT[]
  ) RETURNS SETOF RECORD AS
$$
BEGIN
  RETURN QUERY SELECT
    col->'Constraint'->>'conname',
	ARRAY (
	    SELECT b->'String'->>'sval'
	    FROM jsonb_array_elements(col->'Constraint'->'fk_attrs') as t(b)
  	) as fk_attrs,
	ARRAY (
	    SELECT b->'String'->>'sval'
	    FROM jsonb_array_elements(col->'Constraint'->'pk_attrs') as t(b)
  	) as pk_attrs
  FROM 
  (
    SELECT 
      jsonb_array_elements(
        _json->'statements'->0->'stmt'->'CreateStmt'->'tableElts') AS col
  ) q
  WHERE col->'Constraint'->>'contype' = 'CONSTR_FOREIGN';
END;
$$ LANGUAGE PLPGSQL;

-- SELECT* FROM constr_foreign((select j from j));


/* CONSTR_PRIMARY */

CREATE OR REPLACE FUNCTION constr_primary(
	  _json JSONB,
	  conname OUT TEXT,
	  keys OUT TEXT[]
  ) RETURNS SETOF RECORD AS
$$
BEGIN
  RETURN QUERY SELECT
    col->'Constraint'->>'conname',
	ARRAY (
	    SELECT b->'String'->>'sval'
	    FROM jsonb_array_elements(col->'Constraint'->'keys') as t(b)
  	) as keys
  FROM 
  (
    SELECT 
      jsonb_array_elements(
        _json->'statements'->0->'stmt'->'CreateStmt'->'tableElts') AS col
  ) q
  WHERE col->'Constraint'->>'contype' = 'CONSTR_PRIMARY';
END;
$$ LANGUAGE PLPGSQL;

CREATE OR REPLACE FUNCTION constr_unique(
	  _json JSONB,
	  conname OUT TEXT,
	  keys OUT TEXT[]
  ) RETURNS SETOF RECORD AS
$$
BEGIN
  RETURN QUERY SELECT
    col->'Constraint'->>'conname',
	ARRAY (
	    SELECT b->'String'->>'sval'
	    FROM jsonb_array_elements(col->'Constraint'->'keys') as t(b)
  	) as keys
  FROM 
  (
    SELECT 
      jsonb_array_elements(
        _json->'statements'->0->'stmt'->'CreateStmt'->'tableElts') AS col
  ) q
  WHERE col->'Constraint'->>'contype' = 'CONSTR_UNIQUE';
END;
$$ LANGUAGE PLPGSQL;

CREATE OR REPLACE FUNCTION constr_check(
  _json    JSONB
)
RETURNS TABLE (
  conname TEXT,
  kind    TEXT,
  keys    TEXT[]
) AS
$$
BEGIN
  RETURN QUERY
    SELECT
      col->'Constraint'->>'conname',
      col->'Constraint'->'raw_expr'->'BoolExpr'->>'boolop' AS kind,
      ARRAY(
        SELECT jsonb_object_keys(e)
          FROM jsonb_array_elements(col->'Constraint'->'raw_expr'->'BoolExpr'->'args') AS e
      )
    FROM jsonb_array_elements(
           _json->'statements'->0->'stmt'->'CreateStmt'->'tableElts'
         ) AS col
    WHERE (col->'Constraint'->'raw_expr') ? 'BoolExpr';
  RETURN QUERY
    SELECT
      col->'Constraint'->>'conname',
      (SELECT key FROM jsonb_each(col->'Constraint'->'raw_expr') LIMIT 1) AS kind,
      ARRAY[col->'Constraint'->>'columns']
    FROM jsonb_array_elements(
           _json->'statements'->0->'stmt'->'CreateStmt'->'tableElts'
         ) AS col
    WHERE NOT (col->'Constraint'->'raw_expr') ? 'BoolExpr';
END;
$$ LANGUAGE plpgsql;

SELECT * FROM constr_primary((select j from j));
SELECT * FROM constr_foreign((select j from j));
SELECT * FROM constr_unique((select j from j));
SELECT * FROM constr_check((select j from j));

-- SELECT * FROM foo join bar using(a,b)