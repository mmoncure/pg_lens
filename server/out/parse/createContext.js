"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContext = createContext;
const ParserTS = require("tree-sitter");
const SQL = require("@derekstride/tree-sitter-sql");
const parser = new ParserTS();
parser.setLanguage(SQL);
// organized :)
// const preInsertDelete = `DELETE FROM "table_columns" WHERE table_schema='public'` // change ASAP
/**
 *
 * DEPRECATED!!! DO NOT USE, WILL EMPTY RETURN
 *
 * @param statement
 * @param client
 * @returns
 */
async function createContext(statement, client) {
    let munchedSQL = [];
    const tree = parser.parse(statement);
    // await main.jsonify(tree.rootNode,munchedSQL)
    return munchedSQL;
}
//# sourceMappingURL=createContext.js.map