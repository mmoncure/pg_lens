# PG_Lens
    i need to do this lol. def needs a readme probably

## Sample usage

## Install

### NPM

```bash
git clone https://github.com/mmoncure/pg_lens.git
cd pg_lens && git switch lsp-in
npm i
```

## Setup

### Test Environment

in **pg_lens** root dir:
```bash
mkdir .vscode && mv launch.json .vscode
```

### Environment Variables

```
PG_USER="<pg_username>"
PG_PASS="<pg_password>"
PG_HOST="<pg_host>"
DB_NAME="<db_name>"
PG_PORT="<pg_port>"
```

```js
const pool = new Pool({
	user: process.env.PG_USER,
	password: process.env.PG_PASS,
	host: process.env.PG_HOST,
	port: process.env.PG_PORT,
	database: process.env.DB_NAME,
});
```

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
    end_position text COLLATE pg_catalog."default"
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
    end_position text COLLATE pg_catalog."default"
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.table_columns
    OWNER to postgres;
```

## Usage

For now, just "Run and Debug

## Dependencies
