# PG_Lens

This version is built around the vscode lsp extension source; do not expect it to function outside of vscode.

Uses Treesitter and a pgsql grammar forked from @DerekStride. You can find and contribute to that [here](https://github.com/maximjov/tree-sitter-sql).

## Release

You can download the Alpha release [here](https://github.com/mmoncure/pg_lens/releases/tag/v1.0-alpha.1)

## Demo

![Demo Gif](https://github.com/mmoncure/pg_lens/blob/lsp-in/docs/demo.gif?raw=true)

## Install

### Database Setup

You will need a postgres database with two tables set up, these are needed regardless of whether manual setup or the extension is used.

### Create Scripts

**table_columns:**
```sql
-- Table: public.table_columns

-- DROP TABLE IF EXISTS public.table_columns;

CREATE TABLE IF NOT EXISTS public.table_columns
(
    table_schema text COLLATE pg_catalog."default" NOT NULL,
    table_name text COLLATE pg_catalog."default" NOT NULL,
    column_name text COLLATE pg_catalog."default" NOT NULL,
    column_type text COLLATE pg_catalog."default" NOT NULL,
    is_not_null boolean,
    column_default text COLLATE pg_catalog."default",
    stmt text COLLATE pg_catalog."default" NOT NULL,
    start_position text COLLATE pg_catalog."default",
    end_position text COLLATE pg_catalog."default",
    path_file text COLLATE pg_catalog."default"
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.table_columns
    OWNER to postgres;
```

**function_args:**
```sql
-- Table: public.function_args

-- DROP TABLE IF EXISTS public.function_args;

CREATE TABLE IF NOT EXISTS public.function_args
(
    function_name text COLLATE pg_catalog."default" NOT NULL,
    argument_name text COLLATE pg_catalog."default" NOT NULL,
    argument_type text COLLATE pg_catalog."default" NOT NULL,
    argument_default text COLLATE pg_catalog."default",
    stmt text COLLATE pg_catalog."default" NOT NULL,
    start_position text COLLATE pg_catalog."default",
    end_position text COLLATE pg_catalog."default",
    path_file text COLLATE pg_catalog."default"
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.function_args
    OWNER to postgres;
```

### Secrets

Set your secrets in the settings after you have the extension installed by right clicking it and picking settings from the context menu. You'll need to set:

```
postgres    username    (string)
postgres    password    (string)
postgres    host        (string)
postgres    port        (string)
database    name        (string)
logging     checkbox    (boolean)
```

## ToDo (soon lol)

### -- server --

1. move coords logic to postgers and index
  1a. improve tables/columns
  1b. rewrite search to exploit


2. auto doc to add coment to storage
  2a. a comment columns to things
  /* this table documents things */
  CREATE TABLE foo

3. workspace to be added to all things

4. better handling of schemas (assume public)
  4a. treat null as matching

/*
 * meta commands:
 ** ##schema=public
 ** ##database=foo
 */

 5. graceful failure on bad db connection.
   1. log connection to database at url username@host/dbname
   2. log db error
   3. process.exit()

 6. better db initialization
   6a. ask for schema
   6b. create if not exists then tables etc.
   6c. mark schema version


### -- grammar --

1. nested comments 
2. issues with greediness (most concerns)
3. procedures (CREATE PROCEDURE)
4. DP command
5. procedure / function guts
6. VIEWS (easy?)
7. client meta