# Install

I'm open to feedback & encourage you to [open an issue](https://github.com/maximjov/tree-sitter-sql/issues/new) to discuss any features or problems with changes.

For any issues related to non-forked related problems, you can open an issue in the [original project](https://github.com/DerekStride/tree-sitter-sql/issues/new) by @DerekStride


## Downloading Files
```bash
git clone https://github.com/maximjov/tree-sitter-sql.git
cd tree-sitter-sql
git checkout gh-pages
```

## Setting Up
**Using [npm](https://www.npmjs.com/package/@maximjov/tree-sitter-sql)**

Firstly, install dependencies.

```bash
npm install
```

After that is finished, use this to build an initial working version of the grammar.

```bash
rm -rf build src/parser.c src/parser.cc src/scanner.o
tree-sitter generate -b --libdir ./build
npm rebuild
```

**Please see [Grammar](tsGrammar.md) for next steps.**