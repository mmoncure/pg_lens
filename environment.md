# Environment

Firstly, we have to set up a .vscode folder to include our launch.json in. `launch.json` is provided in the root, so you can run this in project root to get it set up:

```bash
mkdir .vscode && mv launch.json .vscode
```

## Environment Secrets

you can use **.env** in testing

```
PG_USER="<pg_username>"
PG_PASS="<pg_password>"
PG_HOST="<pg_host>"
DB_NAME="<db_name>"
PG_PORT="<pg_port>"
```

**OR...**
Set secrets in package.json or extension settings

**Please see [Database](database.md) for next steps.**