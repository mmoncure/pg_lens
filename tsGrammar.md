# Grammar

But you're here to get your own custom grammar because I made a bunch of mistakes and you're unhappy right? 

First take a peek into `grammar.js` and make your desired changes.

Then rerun this lol...

```bash
rm -rf build src/parser.c src/parser.cc src/scanner.o
tree-sitter generate -b --libdir ./build
npm rebuild
```

**Please see [Using](tsBuild.md) for next steps.**