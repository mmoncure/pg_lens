#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const parser = __importStar(require("libpg-query"));
const fs = __importStar(require("fs"));
const pg_1 = require("pg");
const dotenv = __importStar(require("dotenv"));
const yargs_1 = __importDefault(require("yargs"));
const argv = (0, yargs_1.default)(process.argv.slice(2)).options({
    i: { type: 'string', demandOption: true },
    o: { type: 'string' },
    rw: { type: 'string', choices: ['db', 'stdout'], demandOption: true },
    d: { type: 'boolean', default: false }
}).parseSync();
dotenv.config({ path: "/Users/maxim.jovanovic/Desktop/testlsp/.env" });
// pg setup
// console.log(process.env.PG_USER)
const client = new pg_1.Client({
    user: process.env.PG_USER,
    password: process.env.PG_PASS,
    host: process.env.PG_HOST,
    port: 5432,
    database: process.env.DB_NAME,
});
function parse(docPath, outPath, debug) {
    return __awaiter(this, void 0, void 0, function* () {
        var sampleSQLtest = fs.readFileSync(docPath).toString();
        // console.log(sampleSQLtest)
        const splitSQL = yield lintPSQL(sampleSQLtest);
        // console.log(splitSQL.sql)
        const stmts = yield createStatements(splitSQL.sql, splitSQL.psql);
        fs.writeFileSync(outPath || "./dog.json", JSON.stringify(stmts, null, 2));
        process.exit(1);
    });
}
function lintPSQL(document) {
    return __awaiter(this, void 0, void 0, function* () {
        const backslashLines = document.match(/^\\.*$/gm) || [];
        const cleaned = document.replace(/^\\.*$/gm, '').replace(/^\s*[\r\n]/gm, '');
        return ({ sql: cleaned, psql: backslashLines });
    });
}
function createStatements(lintedDocument, psql) {
    return __awaiter(this, void 0, void 0, function* () {
        const statements = [];
        let currentStatement = '';
        let insideSingleQuote = false;
        let previousChar = '';
        let statementStartIndex = 0;
        for (let i = 0; i < lintedDocument.length; i++) {
            const char = lintedDocument[i];
            if (char === "'" && previousChar !== '\\') {
                insideSingleQuote = !insideSingleQuote;
            }
            if (!insideSingleQuote && char === ';') {
                const trimmedStatement = currentStatement.trim();
                const startOffset = lintedDocument.indexOf(trimmedStatement, statementStartIndex);
                const stmtLen = trimmedStatement.length;
                try {
                    let parsified = yield parser.parseQuery(trimmedStatement);
                    if (parsified.stmts === undefined) {
                        throw new Error("something very weird happened");
                    }
                    let stmtobj = {
                        stmt: parsified.stmts[0].stmt,
                        stmt_len: stmtLen,
                        stmt_location: startOffset,
                        error: false,
                        reason: undefined,
                    };
                    statements.push(stmtobj);
                }
                catch (e) {
                    let stmtobj = {
                        stmt: undefined,
                        stmt_len: stmtLen,
                        stmt_location: startOffset,
                        error: true,
                        reason: e.toString(),
                    };
                    statements.push(stmtobj);
                }
                statementStartIndex = i + 1;
                currentStatement = '';
            }
            else {
                currentStatement += char;
            }
            previousChar = char;
        }
        if (currentStatement.trim().length > 0) {
            const trimmedStatement = currentStatement.trim();
            const startOffset = lintedDocument.indexOf(trimmedStatement, statementStartIndex);
            const stmtLen = trimmedStatement.length;
            try {
                let parsified = yield parser.parseQuery(trimmedStatement);
                if (parsified.stmts === undefined) {
                    throw new Error("something very weird happened");
                }
                let stmtobj = {
                    stmt: parsified.stmts[0].stmt,
                    stmt_len: stmtLen,
                    stmt_location: startOffset,
                    error: false,
                    reason: undefined,
                };
                statements.push(stmtobj);
            }
            catch (e) {
                let stmtobj = {
                    stmt: undefined,
                    stmt_len: stmtLen,
                    stmt_location: startOffset,
                    error: true,
                    reason: e.toString(),
                };
                statements.push(stmtobj);
            }
        }
        return {
            statements: statements,
            psql: psql
        };
    });
}
// testing 
(() => __awaiter(void 0, void 0, void 0, function* () {
    // console.log(argv.i)
    // console.log(argv.o)
    // console.log(argv.rw)
    // console.log(argv.d)
    if (argv.rw === "db") {
        yield client.connect();
        yield parse(argv.i, argv.o, argv.d);
    }
    else {
        yield parse(argv.i, argv.o, argv.d);
    }
}))();
