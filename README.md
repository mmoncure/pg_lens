# Sample usage
```pglens -i sampleComplex.sql -o temp.json --rw db```

# Install
- sudo npm i -g

# Usage
1. 
```
npm run build
```
2. 
```
pglens:
    --help     Show help                                             [boolean]
    --version  Show version number                                   [boolean]
-i                                                         [string] [required]
-o                                                                    [string]
    --rw                         [string] [required] [choices: "db", "stdout"]
-d                                                  [boolean] [default: false]
```

#Dependencies
- "dotenv": "^16.5.0",
- "libpg-query": "^17.1.1",
- "pg": "^8.16.0",
- "typescript": "^5.8.3",
- "util": "^0.12.5",
- "yargs": "^18.0.0"
