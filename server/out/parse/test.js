"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const main = require("./main");
const ParserTS = require("tree-sitter");
const SQL = require("@derekstride/tree-sitter-sql");
const fs = require("fs");
const parser = new ParserTS();
parser.setLanguage(SQL);
async function m() {
    const tree = parser.parse(`
		SELECT * from awesome.dog WHERE cat=5;	
	`);
    const retval = [];
    await main.dfsFlatten(tree.rootNode, "", retval);
    fs.writeFileSync('./test.json', JSON.stringify(retval, null, 2));
    retval.forEach((i, idx) => {
        console.log(i);
    });
}
m();
//# sourceMappingURL=test.js.map