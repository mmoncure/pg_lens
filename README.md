# PG_Lens
To specify, this branch is built around the vscode lsp extension source; do not expect it to function outside of vscode.

Uses Treesitter and pgsql grammar forked from @DerekStride. You can find and contribute to that [here](https://github.com/maximjov/tree-sitter-sql).

## Releases

Check out releases for the build .vsix extension!

## Install

### NPM

```bash
git clone https://github.com/mmoncure/pg_lens.git
cd pg_lens && git switch lsp-in
npm i && code .
```

### Test Environment

in **pg_lens** root dir:
```bash
mkdir .vscode && mv launch.json .vscode
```

Then: Run and Debug "Launch Client"

or run in **pg_lens** root dir:
```bash
npx vsce package
```
to build an extension you can install into your vscode client.

### Environment Secrets

#### .env

```
PG_USER="<pg_username>"
PG_PASS="<pg_password>"
PG_HOST="<pg_host>"
DB_NAME="<db_name>"
PG_PORT="<pg_port>"
```

OR...
#### config

Set secrets in package.json or extension settings

### Database scripts

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
    path_file text COLLATE pg_catalog."default
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.function_args
    OWNER to postgres;
```
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
