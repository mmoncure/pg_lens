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
	DidChangeTextDocumentParams,
	SemanticTokensBuilder,
	_Connection
} from 'vscode-languageserver/node';

import { Pool, PoolClient } from 'pg'

import * as path from 'path'
import * as fs from 'fs'

import {
	TextDocument
} from 'vscode-languageserver-textdocument';

import * as parser from 'libpg-query'

import * as types from './parse/types'
import * as pg_lens from './parse/main'
import { completion } from 'yargs';


// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);


// Create a simple text document manager.
const documents = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

export const legend = { tokenTypes: [...types.tokenTypes], tokenModifiers: [...types.tokenModifiers] };

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
				triggerCharacters: [' ', '(', ',']
			},
			diagnosticProvider: {
				interFileDependencies: false,
				workspaceDiagnostics: false
			},
			semanticTokensProvider: {
				legend,
				full: true,
				// range: true
      		},
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

type PgLensSettings = { pguser?: string, pgpass?: string, pghost?: string, pgport?: string, dbname?: string }
let defaultSettings: PgLensSettings = { pguser: 'postgres', pgpass: 'admin', pghost: 'localhost', pgport: '5432', dbname: 'postgres' }

const documentSettings = new Map<string, Thenable<PgLensSettings>>()


connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		defaultSettings = (
			(change.settings.pgLens || defaultSettings)
		);
	}
	// Refresh the diagnostics since the `maxNumberOfProblems` could have changed.
	// We could optimize things here and re-fetch the setting first can compare it
	// to the existing setting, but this is out of scope for this example.
	connection.languages.diagnostics.refresh();
});

function getDocumentSettings(resource: string): Thenable<PgLensSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(defaultSettings);
	}
	const key = resource ?? '__global__'
	let result = documentSettings.get(key)
	if (!result) {
		result = connection.workspace.getConfiguration({
		scopeUri: resource,
		section: 'pgLens'
		}) as Thenable<PgLensSettings>
		documentSettings.set(key, result)
	}
	return result
}

// Only keep settings for open documents
documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
});


async function getPgData(scopeUri?: string) {
  const cfg = await getDocumentSettings(scopeUri || "")
  return {
	pguser: cfg.pguser ?? defaultSettings.pguser,
	pgpass: cfg.pgpass ?? defaultSettings.pgpass,
	pghost: cfg.pghost ?? defaultSettings.pghost,
	pgport: cfg.pgport ?? defaultSettings.pgport,
	dbname: cfg.dbname ?? defaultSettings.dbname
  }
}


const pool = async () => new Pool({
	user: process.env.PG_USER || (await getPgData()).pguser,
	password: process.env.PG_PASS || (await getPgData()).pgpass,
	host: process.env.PG_HOST || (await getPgData()).pghost,
	port: parseInt(process.env.PG_PORT || (await getPgData()).pgport || "5432"),
	database: process.env.DB_NAME || (await getPgData()).dbname,
});

let clientParse: PoolClient;
let clientCompletion: PoolClient;


(async () => {
  try {
	// console.log(pool)
    clientParse = await (await pool()).connect();
	clientCompletion = await (await pool()).connect();
  } catch (err) {
    console.error('Failed to connect to Postgres', err);
    process.exit(1);
  }
})();

connection.languages.semanticTokens.on(async (params) => {
	const builder = new SemanticTokensBuilder();
	const doc = documents.get(params.textDocument.uri)!;
	const ast = await pg_lens.parse(clientParse, doc.getText(),"",true,"", params.textDocument.uri)

	let highlights = await pg_lens._flatHighlights(ast, doc)
	
	for (let i = 0; i < highlights.length; i++) {
		builder.push(highlights[i].stl, highlights[i].stc, highlights[i].len, highlights[i].typ, highlights[i].dum);
	}
	let b = builder.build()
	return b
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

	const diagnostics: Diagnostic[] = [];
	
	const tree = await pg_lens.parse(clientParse, textDocument.getText(),"",true,"", params.textDocument.uri)
	// console.log(tree)
	const diagHits = await pg_lens._flatDiagnostics(tree)

	for (var i = 0; i < diagHits.length; i++) { 
		const diagnostic: Diagnostic = {
			severity: (diagHits[i].severity as DiagnosticSeverity),
			range: {
				start: diagHits[i].range.start,
				end: diagHits[i].range.end,
			},
			message: `Our parsing does not permit more in depth error checking`, // maybe find more in depth error reporting?
			source: '\n\nIt is recommended to check out the docs: https://www.postgresql.org/docs/current/sql.html'
		};
		diagnostics.push(diagnostic)
	}

	if (diagnostics === undefined) {
		console.log('Something went wrong while generating diagnostics')
		return [];
	}

	return diagnostics;
}

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received a file change event');
});




connection.onCompletion(async (params: CompletionParams): Promise<CompletionItem[]> => {
	const doc = documents.get(params.textDocument.uri);
	if (!doc) return [];

	let found = false
	let i = doc.offsetAt(params.position)
	for (i; i > 0 && found === false; i--) {
		if (doc.getText()[i] === ';') found = true;
		// console.log(`${txt[i]} == ; @ ${i}`)
	}

	const completions: CompletionItem[] = [];
	let flatstmts;
	
	if (found) { // more than one statement, so use current
		flatstmts = await pg_lens.parse(clientParse, doc.getText().substring(i+2,doc.offsetAt(params.position)),"",true,"", params.textDocument.uri)
	}
	else {
		flatstmts = await pg_lens.parse(clientParse,doc.getText(),"",true,"",params.textDocument.uri)
	}

	const avail_completions = await pg_lens._createCompletions(flatstmts, clientCompletion)
		
	for (let i = 0; i < avail_completions.length; i++) {
		completions.push({
			detail: avail_completions[i].detail,
			insertText: avail_completions[i].insertText,
			label: avail_completions[i].label,
			kind: CompletionItemKind.Text
		})
	}

	return completions;

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
			let f: any = await pg_lens.parse(clientParse, doc,"",true,"db", params.document.uri)
			try {
				// console.log('Writing to:', path.resolve('./test.json'));
				// fs.writeFileSync(`${process.cwd()}/test.json`, JSON.stringify(f, null, 2));
			} catch (err) {
				console.error('Failed to write file:', err);
			}
			// console.log(f)
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
