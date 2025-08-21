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
	TextDocumentSyncKind,
	InitializeResult,
	DocumentDiagnosticReportKind,
	type DocumentDiagnosticReport,
	CompletionParams,
	DocumentDiagnosticParams,
	SemanticTokensBuilder,
	_Connection
} from 'vscode-languageserver/node';

import * as pg from 'pg'

import * as path from 'path'
import * as fs from 'fs'

import {
	TextDocument
} from 'vscode-languageserver-textdocument';

import * as types from './parse/types'
import * as pg_lens from './parse/main'

import logger from './parse/util/log';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

console.log('Pre-init: PG Lens Language Server is starting, connection created');

// Create a simple text document manager.
const documents = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

export const legend = { tokenTypes: [...types.tokenTypes], tokenModifiers: [...types.tokenModifiers] };

connection.onInitialize((params: InitializeParams) => {

	console.log('Pre-init: Connection intialize started');

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
	console.log('Pre-init: Connection initialized');
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			logger.log('Workspace folder change event received.');
		});
	}
});

type PgLensSettings = { pguser: string, pgpass: string, pghost: string, pgport: string, dbname: string, logging: boolean }
let defaultSettings: PgLensSettings = { pguser: 'postgres', pgpass: 'admin', pghost: 'localhost', pgport: '5432', dbname: 'postgres', logging: true };

const documentSettings = new Map<string, Thenable<PgLensSettings>>()


connection.onDidChangeConfiguration(change => {
	console.log('\nInit complete, LSP ready\n\n');
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		console.log(change.settings.pgLens, "change.settings.pgLens");
		defaultSettings = (
			(change.settings.pgLens || defaultSettings)
		);
	}
	connection.languages.diagnostics.refresh();
});

function getDocumentSettings(resource: string): Thenable<PgLensSettings> {
	console.log('Pre-init: Getting document settings');
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
	console.log('Document closed:', e.document.uri);
	documentSettings.delete(e.document.uri);
});


/**
 * 
 * Gets the PostgreSQL connection data from the document settings.
 * 
 * @param scopeUri - The URI of the document to get settings for.
 * @returns A promise that resolves to an object containing PostgreSQL connection data.
 */
async function getPgData(scopeUri?: string) {
	console.log('Pre-init: Getting PostgreSQL connection and logging data');
	const cfg = await getDocumentSettings(scopeUri || "")
	
	return {
		pguser: cfg.pguser ?? defaultSettings.pguser,
		pgpass: cfg.pgpass ?? defaultSettings.pgpass,
		pghost: cfg.pghost ?? defaultSettings.pghost,
		pgport: cfg.pgport ?? defaultSettings.pgport,
		dbname: cfg.dbname ?? defaultSettings.dbname,
		logging: cfg.logging ?? defaultSettings.logging
	}
}

const client = async (pgData: PgLensSettings) => new pg.Client({
	user: process.env.PG_USER || pgData.pguser,
	password: process.env.PG_PASS || pgData.pgpass,
	host: process.env.PG_HOST || pgData.pghost,
	port: parseInt(process.env.PG_PORT || pgData.pgport || "5432"),
	database: process.env.DB_NAME || pgData.dbname,
});

let clientParse: pg.Client;
let clientCompletion: pg.Client;
(async () => {
  try {
	console.log('Pre-init: Establishing connection to Postgres and initializing logger');
	const pgData = await getPgData();
	console.log(pgData.logging, "what? ", process.env.LOGGING);
	logger.setLog(process.env.LOGGING === 'true' ? true : process.env.LOGGING === 'false' ? false : pgData.logging);
	clientParse = await client(pgData);
	await clientParse.connect();
	clientCompletion = await client(pgData);
	await clientCompletion.connect();
	
	logger.log("check check");

	// Initialize the database with necessary tables
	await pg_lens._initpgtables(clientParse);

	console.log('Pre-init: Postgres connection established and logger initialized');

  } catch (err) {
    console.error('Failed to connect to Postgres', err);
    process.exit(1);
  }
})();

connection.languages.semanticTokens.on(async (params) => {
	logger.log('Semantic token request received');
	const builder = new SemanticTokensBuilder();
	const doc = documents.get(params.textDocument.uri)!;
	const ast = await pg_lens.parse(clientParse, doc.getText(), false, params.textDocument.uri)

	let highlights = await pg_lens._flatHighlights(ast, doc)
	
	for (let i = 0; i < highlights.length; i++) {
		builder.push(highlights[i].stl, highlights[i].stc, highlights[i].len, highlights[i].typ, highlights[i].dum);
	}
	let b = builder.build()
	logger.log('Semantic token request processed, returning tokens');
	return b
});


connection.languages.diagnostics.on(async (params) => {
	logger.log('Diagnostic request received');
	const document = documents.get(params.textDocument.uri);
	if (document !== undefined) {
		logger.log('Document found, validating text document for diagnostics');
		return {
			kind: DocumentDiagnosticReportKind.Full,
			items: await validateTextDocument(params, document)
		} satisfies DocumentDiagnosticReport;
	} else {
		// We don't know the document. We can either try to read it from disk
		// or we don't report problems for it.
		logger.log('Document not found, returning empty diagnostics');
		return {
			kind: DocumentDiagnosticReportKind.Full,
			items: []
		} satisfies DocumentDiagnosticReport;
	}
});

/**
 * Validates a text document and returns diagnostics.
 * 
 * @param params - The parameters for the document diagnostic request.
 * @param textDocument - The text document to validate.
 * @returns A promise that resolves to an array of diagnostics.
 */
async function validateTextDocument(params: DocumentDiagnosticParams, textDocument: TextDocument): Promise<Diagnostic[]> {
	logger.log('Validating text document for diagnostics');
	const diagnostics: Diagnostic[] = [];
	
	const tree = await pg_lens.parse(clientParse, textDocument.getText(),false, params.textDocument.uri)
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
		logger.log('No diagnostics found, returning empty array');
		return [];
	}
	logger.log('Diagnostics found, returning diagnostics array');
	return diagnostics;
}

// connection.onDidChangeWatchedFiles(_change => {
// 	// Monitored files have change in VSCode
// 	connection.console.log('We received a file change event');
// });



/**
 * Handles completion requests and returns completion items based on the current context.
 */
connection.onCompletion(async (params: CompletionParams): Promise<CompletionItem[]> => {
	logger.log('Completion request received');
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
		flatstmts = await pg_lens.parse(clientParse, doc.getText().substring(i+2,doc.offsetAt(params.position)),false,params.textDocument.uri)
	}
	else {
		flatstmts = await pg_lens.parse(clientParse,doc.getText(),false,params.textDocument.uri)
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
	logger.log('Completion request processed, returning completions');
	return completions;

});

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {
		console.log('I dont know how we arrived here, but we did');
		if (item.data === 1) {
			item.detail = 'Test completion on .';
		}
		return item;
	}
);

/**
 * Handles text document changes and re-parses the document.
 */
documents.onDidChangeContent(async (params) => {
	logger.log('Document content change event received, re-parsing document');
	if (clientParse !== undefined) {
		try {
			const doc = params.document.getText()
			let f: any = await pg_lens.parse(clientParse, doc,true, params.document.uri)
			// try {
			// 	console.log('Writing to:', path.resolve('./test.json'));
			// 	fs.writeFileSync(`${process.cwd()}/test.json`, JSON.stringify(f, null, 2));
			// } catch (err) {
			// 	console.error('Failed to write file:', err);
			// }
			// console.log(f)
		} 
		catch (e) {
			logger.log(`Error during parse: ${e}`);
		}
	}
	else {
		logger.log("Client not ready yet, waiting for db con...")
	}
});

documents.listen(connection);

// Listen on the connection
connection.listen();
