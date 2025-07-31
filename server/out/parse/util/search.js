"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._flattenedSearchSingleTarget = _flattenedSearchSingleTarget;
exports._flattenedSearchMultiTarget = _flattenedSearchMultiTarget;
async function _flattenedSearchSingleTarget(data, targetParsed, targetId, findId = false) {
    // console.log(targetParsed, " ", targetId, " ",  findId)
    // console.log (data)
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
            if (((node.id.toLowerCase() === targetId.toLowerCase())) && node.parsed.toLowerCase() === targetParsed.toLowerCase()) {
                return {
                    data: true,
                    path: node.path
                };
            }
        }
    }
    // console.log('nothing found')
    return {
        data: false,
        path: ""
    };
}
async function _flattenedSearchMultiTarget(data, targetParsed = '', targetId = '', match) {
    const hits = [];
    if (!data)
        return [{ data: hits, path: "" }];
    for (var queue = 0; queue < data.length; queue++) {
        const node = data[queue];
        if (match === 'both') {
            if ((node?.id.toLowerCase() === targetId.toLowerCase()) && node?.parsed.toLowerCase() === targetParsed.toLowerCase()) {
                hits.push({ data: node, path: node.path });
            }
        }
        else if (match === 'parsed') {
            if (node?.parsed.toLowerCase() === targetParsed.toLowerCase()) {
                hits.push({ data: node, path: node.path });
            }
        }
        else {
            if (node?.id.toLowerCase() === targetId.toLowerCase()) {
                hits.push({ data: node, path: node.path });
            }
        }
    }
    return hits;
}
//# sourceMappingURL=search.js.map