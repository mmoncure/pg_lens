/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
	createConnection,
	TextDocuments,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	CompletionTriggerKind,
	TextDocumentSyncKind,
	InitializeResult,
	DocumentDiagnosticReportKind,
	type DocumentDiagnosticReport,
	CompletionParams,
	TextDocumentPositionParams,
	DocumentDiagnosticParams,
	DidChangeTextDocumentNotification,
	DidChangeTextDocumentParams
} from 'vscode-languageserver/node';

import { Pool, PoolClient } from 'pg'

import {
	TextDocument
} from 'vscode-languageserver-textdocument';

import * as parser from 'libpg-query'

import * as types from './types'
import * as pg_lens from './parse/main'

const pool = new Pool({
	user: process.env.PG_USER,
	password: process.env.PG_PASS,
	host: process.env.PG_HOST,
	port: 5432,
	database: process.env.DB_NAME,
});

let clientParse: PoolClient;
let clientCompletion: PoolClient;


(async () => {
  try {
    clientParse = await pool.connect();
	clientCompletion = await pool.connect();
  } catch (err) {
    console.error('Failed to connect to Postgres', err);
    process.exit(1);
  }
})();

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
	const capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we fall back using global settings.
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);
	hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			// Tell the client that this server supports code completion.
			completionProvider: {
				resolveProvider: true,
				triggerCharacters: [' ']
			},
			diagnosticProvider: {
				interFileDependencies: false,
				workspaceDiagnostics: false
			}
		}
	};
	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		};
	}
	return result;
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

// The example settings
interface ExampleSettings {
	maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings = new Map<string, Thenable<ExampleSettings>>();

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = (
			(change.settings.languageServerExample || defaultSettings)
		);
	}
	// Refresh the diagnostics since the `maxNumberOfProblems` could have changed.
	// We could optimize things here and re-fetch the setting first can compare it
	// to the existing setting, but this is out of scope for this example.
	connection.languages.diagnostics.refresh();
});

function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'languageServerExample'
		});
		documentSettings.set(resource, result);
	}
	return result;
}

// Only keep settings for open documents
documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
});


connection.languages.diagnostics.on(async (params) => {
	const document = documents.get(params.textDocument.uri);
	if (document !== undefined) {
		return {
			kind: DocumentDiagnosticReportKind.Full,
			items: await validateTextDocument(params, document)
		} satisfies DocumentDiagnosticReport;
	} else {
		// We don't know the document. We can either try to read it from disk
		// or we don't report problems for it.
		return {
			kind: DocumentDiagnosticReportKind.Full,
			items: []
		} satisfies DocumentDiagnosticReport;
	}
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
// documents.onDidChangeContent(change => {
// 	validateTextDocument(change.document);
// });

// async function contextTree(params: DocumentDiagnosticParams): Promise<types.stmtTreeSit> {
// 	const doc = documents.get(params.textDocument.uri)?.getText()
// 	const { line, character } = params.;
// 	let found = false
// 	let i = doc.offsetAt(textDocument.position)
// 	for (i; i > 0 && found === false; i--) {
// 		if (txt[i] === ';') found = true;
// 		// console.log(`${txt[i]} == ; @ ${i}`)
// 	}
// }

async function validateTextDocument(params: DocumentDiagnosticParams, textDocument: TextDocument): Promise<Diagnostic[]> {
	// In this simple example we get the settings for every validate run.
	const settings = await getDocumentSettings(textDocument.uri);
	// console.log(settings)

	// The validator creates diagnostics for all uppercase words length 2 and more
	const text = textDocument.getText();

	
	// console.log(text)
	// let g: any = await pg_lens.delAll(client);
	// let g = (await pg_lens.createContext(text.substring(i+2,doc.offsetAt(params.position)), client))
	// let f: any = await pg_lens.parse(client, text,"",true,"stdout")

	// console.log(JSON.stringify(f,null,2))

	const pattern = /\b[A-Z]{2,}\b/g;
	let m: RegExpExecArray | null;

	let problems = 0;
	const diagnostics: Diagnostic[] = [];
	// f.statements.map((p: any) => {
	// 	console.log(p)
	// 	if (p.error == true) {
	// 		problems++;
	// 		const diagnostic: Diagnostic = {
	// 			severity: DiagnosticSeverity.Error,
	// 			range: {
	// 				start: {line: p.stmt_location || 0, character: p.stmt_start || 0},
	// 				end: {line: p.stmt_endlocation || 0, character: p.stmt_len || 0},
	// 			},
	// 			message: `${p.reason}`,
	// 			source: 'ex\n\nIt is recommended to check out the docs: https://www.postgresql.org/docs/current/sql.html'
	// 		};
	// 		// if (hasDiagnosticRelatedInformationCapability) {
	// 		// 	diagnostic.relatedInformation = [
	// 		// 		{
	// 		// 			location: {
	// 		// 				uri: "https://www.postgresql.org/docs/current/sql.html",
	// 		// 				range: Object.assign({}, diagnostic.range)
	// 		// 			},
	// 		// 			message: 'Check out the docs'
	// 		// 		},
	// 		// 	];
	// 		// }
	// 		diagnostics.push(diagnostic);
	// 	}
	// })
	// while ((m = pattern.exec(text)) && problems < settings.maxNumberOfProblems) {
	// 	problems++;
	// 	const diagnostic: Diagnostic = {
	// 		severity: DiagnosticSeverity.Warning,
	// 		range: {
	// 			start: textDocument.positionAt(m.index),
	// 			end: textDocument.positionAt(m.index + m[0].length)
	// 		},
	// 		message: `${m[0]} is all uppercase.`,
	// 		source: 'ex'
	// 	};
	// 	if (hasDiagnosticRelatedInformationCapability) {
	// 		diagnostic.relatedInformation = [
	// 			{
	// 				location: {
	// 					uri: textDocument.uri,
	// 					range: Object.assign({}, diagnostic.range)
	// 				},
	// 				message: 'Spelling matters'
	// 			},
	// 			{
	// 				location: {
	// 					uri: textDocument.uri,
	// 					range: Object.assign({}, diagnostic.range)
	// 				},
	// 				message: 'Particularly for names'
	// 			}
	// 		];
	// 	}
	// 	diagnostics.push(diagnostic);
	// }
	return diagnostics;
}

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received a file change event');
});


connection.onCompletion(async (params: CompletionParams): Promise<CompletionItem[]> => {
	const doc = documents.get(params.textDocument.uri);

	// console.log(doc)

	// let f: any = await pg_lens.parse(clientCompletion, doc?.getText() || "","",true,"stdout")

	if (!doc) return [];

	// GENERIC

	var check_po; // checks ( *open parenthesis*

	// DML

	var table_ex; // table exists
	var check_on; // checks ON
	var check_se; // checks SELECT
	var check_ob; // checks ORDER BY
	var check_gb; // checks GROUP BY
	var check_pb; // checks PARTITION BY
	var check_wh; // checks WHERE
	var check_fr; // checks FROM

	// FUNCTIONS

	var check_fn // checks *keyword_function*
	var check_or // checks *object_reference*


	// snags the current statement (used for contextual completions)
	let txt = doc.getText();

	const { line, character } = params.position;
	let found = false
	let i = doc.offsetAt(params.position)
	for (i; i > 0 && found === false; i--) {
		if (txt[i] === ';') found = true;
		// console.log(`${txt[i]} == ; @ ${i}`)
	}

	if (found) { // more than one statement, so use current
		// console.log(`${i} => ${doc.offsetAt(params.position)}`)
		// console.log(txt.substring(i+2,doc.offsetAt(params.position)))
		let g = (await pg_lens.createContext(txt.substring(i+2,doc.offsetAt(params.position)), clientCompletion))

		/* incomplete statement results in error:
				SELECT *
					SELECT *   (OK)

				SELECT * FROM
					SELECT *   (OK)
					FROM       (ERROR)

				SELECT * FROM "DOG"
					SELECT *   (OK)
					FROM DOG   (OK)

				SELECT * FROM "DOG" WHERE
					SELECT *   (OK)
					FROM DOG   (OK)
					WHERE	   (ERROR)
		*/

		// Check ONLY the last keyword in the statement

		// column lookup (Prompt on keywords, SELECT, WHERE, BY, ON, SET, INTO) TODO: HAVING

		// ON and SELECT don't ERROR, all others create ERROR (ERROR = final term, NOERROR = leaf)

		let tree = g.nextstmt[0]
		// console.log(JSON.stringify(tree,null,2))
		
		// search for table

		table_ex = (pg_lens.treeSearch(tree,"relation","",true)) // maybe, might need changing (object_reference also contains important data)
		
		// complex 
		
		check_on = (pg_lens.treeSearch(tree,"term","ON",false)) // checks for unfinished ON
		check_se = (pg_lens.treeSearch(tree,"select_expression","",false)) // checks for unfinished SELECT
		check_ob = (pg_lens.treeSearch(tree,"order_target","",false)) // checks for unfinished ORDER BY
		check_gb = (pg_lens.treeSearch(tree,"group_by","GROUP BY",false)) // checks for unfinished GROUP BY
		check_pb = (pg_lens.treeSearch(tree,"partition_by","PARTITION BY",false)) // checks for unfinished PARTITION BY

		check_po = (pg_lens.treeSearch(tree,"(","(",false) && !pg_lens.treeSearch(tree,")",")",false))

		// easier lol (cause errors more directly)

		check_wh = (pg_lens.treeSearch(tree,"error","WHERE",false)) // checks for unfinished WHERE

		// table lookup

		check_fr = (pg_lens.treeSearch(tree,"error","FROM",false)) // checks for unfinished FROM

	}
	else { // treat entire doc like the first statement
		console.log(`${0} => ${doc.offsetAt(params.position)}`)
		console.log(txt.substring(0,doc.offsetAt(params.position)))
	}

	

	const beforeCursor = doc.getText({
		start: { line, character: 0 },
		end: { line, character }
	});

	const m = /(?:^|\s)(test)\.$/.exec(beforeCursor);
	// console.log(m != null ? m['1']: 0)
	// console.log("tb: ", table_ex)
	// console.log("on: ", check_on)
	// console.log("se: ", check_se)
	// console.log("ob: ", check_ob)
	// console.log("gb: ", check_gb)
	// console.log("pb: ", check_pb)
	// console.log("po: ", check_po)
	// console.log("wh: ", check_wh)
	// console.log("fr: ", check_fr)
	if (check_se) {
		await clientCompletion.query('BEGIN')
		var cols = (await clientCompletion.query(`SELECT column_name FROM table_columns`)).rows
		await clientCompletion.query('COMMIT')
		var retval: CompletionItem[] = [
			{
				label: "*",
				kind: CompletionItemKind.Text,
				detail: 'none for now',
				insertText: "*"
			}
		]
		cols.map(x => {
			retval.push({
				label: x.column_name,
				kind: CompletionItemKind.Text,
				detail: 'none for now',
				insertText: x.column_name
			})
		})
		// console.log(retval)
		return retval;
	}
	else if (check_wh && table_ex) {
		await clientCompletion.query('BEGIN')
		let test = `SELECT column_name FROM table_columns WHERE table_name=$1`
		var cols = (await clientCompletion.query(test,[table_ex])).rows
		await clientCompletion.query('COMMIT')
		var retval: CompletionItem[] = []
		cols.map(x => {
			retval.push({
				label: x.column_name,
				kind: CompletionItemKind.Text,
				detail: 'none for now',
				insertText: x.column_name
			})
		})
		// console.log(retval)
		return retval;
	}
	else {
		// FOR NOW NOTHING!
		return []
		// return [
		// {
		// 	label: 'Not',
		// 	kind: CompletionItemKind.Text,
		// 	detail: 'lol',
		// 	insertText: 'Not'
		// },
		// {
		// 	label: 'Very',
		// 	kind: CompletionItemKind.Text,
		// 	insertText: 'Very'
		// },
		// {
		// 	label: 'Swag',
		// 	kind: CompletionItemKind.Text,
		// 	insertText: 'Swag'
		// }
		// ];
	}
});

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {
		if (item.data === 1) {
			item.detail = 'Test completion on .';
		}
		return item;
	}
);

documents.onDidChangeContent(async (params) => {
	if (clientParse !== undefined) {
		try {
			const doc = params.document.getText()
			let f: any = await pg_lens.parse(clientParse, doc,"",true,"stdout")
		} 
		catch (e) {
			console.log("Parsing failed: ");
			console.error(e)
		}
	}
	else {
		console.log("waiting for db con...")
	}
});

documents.listen(connection);

// Listen on the connection
connection.listen();
