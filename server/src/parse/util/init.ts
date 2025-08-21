import { PoolClient } from 'pg'

export async function _initpgtables(client: PoolClient): Promise<void> {
    // try {
    // await client.query('BEGIN')
    // await client.query(`
    //     CREATE TABLE IF NOT EXISTS public.function_args
    //     (
    //         function_name text COLLATE pg_catalog."default" NOT NULL,
    //         argument_name text COLLATE pg_catalog."default" NOT NULL,
    //         argument_type text COLLATE pg_catalog."default" NOT NULL,
    //         argument_default text COLLATE pg_catalog."default",
    //         stmt text COLLATE pg_catalog."default" NOT NULL,
    //         start_position text COLLATE pg_catalog."default",
    //         end_position text COLLATE pg_catalog."default",
    //         path_file character varying(125) COLLATE pg_catalog."default"
    //     )
    // `)
    // await client.query('COMMIT')
    // }
    // catch (error) {
    //     await client.query('ROLLBACK')
    //     console.error('Error initializing pg tables:', error)
    //     throw error
    // }
    // try {
    //     await client.query('BEGIN')
    //     await client.query(`CREATE TABLE IF NOT EXISTS public.table_columns
    //         (
    //         table_schema text COLLATE pg_catalog."default" NOT NULL,
    //         table_name text COLLATE pg_catalog."default" NOT NULL,
    //         column_name text COLLATE pg_catalog."default" NOT NULL,
    //         column_type text COLLATE pg_catalog."default" NOT NULL,
    //         is_not_null boolean,
    //         column_default text COLLATE pg_catalog."default",
    //         stmt text COLLATE pg_catalog."default" NOT NULL,
    //         start_position text COLLATE pg_catalog."default",
    //         end_position text COLLATE pg_catalog."default",
    //         path_file character varying(125) COLLATE pg_catalog."default"
    //     )`)
    // }
    // catch(error) {
    //     await client.query('ROLLBACK')
    //     console.error('Error initializing pg tables:', error)
    //     throw error
    // }
}