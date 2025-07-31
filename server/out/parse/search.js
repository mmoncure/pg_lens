"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._flattenedSearchSingleTarget = _flattenedSearchSingleTarget;
async function _flattenedSearchSingleTarget(data, targetParsed, targetId, findId = false) {
    // console.log(targetParsed, " ", targetId, " ",  findId)
    console.log(data);
    for (let i = 0; i < data.length; i++) {
        const node = data[i];
        if (findId) {
            if (node.parsed.toLowerCase() === targetParsed.toLowerCase()) {
                return {
                    data: node.id,
                    path: node.path
                };
            }
        }
        else {
            if (((targetId !== '') ? (node.id.toLowerCase() === targetId.toLowerCase()) : true) && node.parsed.toLowerCase() === targetParsed.toLowerCase()) {
                return {
                    data: true,
                    path: node.path
                };
            }
        }
    }
    console.log('nothing found');
    return {
        data: false,
        path: ""
    };
}
//# sourceMappingURL=search.js.map