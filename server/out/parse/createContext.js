"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContext = createContext;
const main = require("./main");
const ParserTS = require("tree-sitter");
const SQL = require("@derekstride/tree-sitter-sql");
const parser = new ParserTS();
parser.setLanguage(SQL);
// organized :)
async function createContext(statement) {
    let munchedSQL = {
        coords: "full",
        parsed: ":)",
        id: ":)",
        nextstmt: [],
    };
    const tree = parser.parse(statement);
    main.jsonify(tree.rootNode, munchedSQL);
    return munchedSQL;
}
//# sourceMappingURL=createContext.js.map