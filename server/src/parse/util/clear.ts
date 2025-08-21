import { Client } from 'pg'
import logger from './log'

export async function _clearDbTables(client: Client): Promise<void> {
    logger.log('deleting all rows from public.function_args and public.table_columns')
    try {
        await client.query('BEGIN')
        await client.query(`DELETE FROM public.function_args`)
        await client.query(`DELETE FROM public.table_columns`);
        await client.query('COMMIT')
    }
    catch (error) {
        await client.query('ROLLBACK')
        console.error(`Error clearing pg tables: ${error}`)
    }
}