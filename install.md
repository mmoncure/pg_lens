# Installation

To preface, this version of PG Lens is built around the vscode lsp extension boilerplate, so no guarantees it will work on any other code editors.

## NPM

You will clone pg_lens repo. Then move into that dir and switch our branch to lsp-in (the vscode extension branch). Next you have to install all packages and open the project in *ideally* vscode.

```bash
git clone https://github.com/mmoncure/pg_lens.git
cd pg_lens && git switch lsp-in
npm i && code .
```

**Please see [Build](build.md) for next steps.**
