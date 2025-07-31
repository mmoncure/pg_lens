"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._createCompletions = _createCompletions;
const search_1 = require("../util/search");
async function _createCompletions(flatstmts, clientCompletion) {
    var retval = [];
    const table_ex = (await ((0, search_1._flattenedSearchSingleTarget)(flatstmts, "relation", "", true))).data; // maybe, might need changing (object_reference also contains important data)
    const obj_ref = (await ((0, search_1._flattenedSearchSingleTarget)(flatstmts, "object_reference", "", true))).data;
    // we need the final statement, but everything is flat now, so tree isnt preserved.
    // cant index final statement, so i will use text matching with path starting at back
    for (var j = flatstmts.length - 1; j >= 0; j--) {
        if (flatstmts[j].path === "/program/statement" || flatstmts[j].path === "/program") {
            flatstmts = flatstmts.slice(j);
            break;
        }
    }
    // stuffs
    const check_po = (await ((0, search_1._flattenedSearchSingleTarget)(flatstmts, "(", "(", false))).data && !((await (0, search_1._flattenedSearchSingleTarget)(flatstmts, ")", ")", false)).data);
    // tables
    const check_et = (await ((0, search_1._flattenedSearchSingleTarget)(flatstmts, "term", "", false))).data; // checks for empty term
    const check_on = (await ((0, search_1._flattenedSearchSingleTarget)(flatstmts, "term", "ON", false))).data; // checks for unfinished ON
    const check_se = (await ((0, search_1._flattenedSearchSingleTarget)(flatstmts, "select_expression", "", false))).data; // checks for unfinished SELECT
    const check_ob = (await ((0, search_1._flattenedSearchSingleTarget)(flatstmts, "order_target", "", false))).data; // checks for unfinished ORDER BY
    const check_gb = (await ((0, search_1._flattenedSearchSingleTarget)(flatstmts, "group_by", "GROUP BY", false))).data; // checks for unfinished GROUP BY
    const check_pb = (await ((0, search_1._flattenedSearchSingleTarget)(flatstmts, "partition_by", "PARTITION BY", false))).data; // checks for unfinished PARTITION BY
    const check_wh = (await ((0, search_1._flattenedSearchSingleTarget)(flatstmts, "error", "WHERE", false))).data; // checks for unfinished WHERE
    const check_fr = (await ((0, search_1._flattenedSearchSingleTarget)(flatstmts, "error", "FROM", false))).data; // checks for unfinished FROM
    // functions
    const check_ea = (await ((0, search_1._flattenedSearchMultiTarget)(flatstmts, "term", "", "parsed")));
    var rows = [];
    let functionQuery = '';
    let tableQuery = '';
    let tableParams = [];
    let functionParams = [];
    let key = 'column_name';
    try {
        await clientCompletion.query('BEGIN');
        if (check_se && check_et) {
            rows.push({
                all: "*"
            });
            functionQuery = `SELECT DISTINCT function_name FROM function_args`;
            tableQuery = `SELECT column_name FROM table_columns`;
        }
        else if (check_wh && table_ex) {
            tableQuery = `SELECT column_name FROM table_columns WHERE table_name = $1`;
            tableParams = [table_ex];
        }
        else if (check_fr) {
            tableQuery = `SELECT DISTINCT table_name FROM table_columns`;
            key = 'table_name';
        }
        else if (check_po) {
            functionQuery = `SELECT argument_name from function_args WHERE function_name = $1`;
            functionParams = [obj_ref];
        }
        let fRows = (await clientCompletion.query(functionQuery, functionParams)).rows.filter((x) => {
            for (let i = 0; i < check_ea.length; i++) {
                if (check_ea[i].data.id === Object.values(x)[0])
                    return false;
            }
            return true;
        });
        rows = [...rows, ...(await clientCompletion.query(tableQuery, tableParams)).rows, ...fRows];
        console.log(rows);
        await clientCompletion.query('COMMIT');
    }
    catch (e) {
        console.error(e);
    }
    for (let i = 0; i < rows.length; i++) {
        retval.push({
            label: `${Object.values(rows[i])[0]}: ${Object.keys(rows[i])[0]}`,
            detail: key === 'table_name' ? 'All possible relations' : 'none for now',
            insertText: Object.values(rows[i])[0],
        });
    }
    ;
    return retval;
}
//# sourceMappingURL=completion.js.map