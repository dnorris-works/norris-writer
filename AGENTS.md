# Norris Writer — Agent Instructions

Norris Writer is a standalone fiction writing app built from Code OSS sources.

For product goals (what to keep and build), see [.cursor/rules/product-vision.mdc](.cursor/rules/product-vision.mdc).

## Architecture

- Product code: `src/vs/workbench/contrib/norrisWriter/`
- App data: `~/.norris-writer/` (`product.json` `dataFolderName`)
- Codex SQLite: `{userDataPath}/codex.db`

## Validation

- `npm run compile`
- `npm run test-node -- --run src/vs/workbench/contrib/norrisWriter/test/node/codexDatabase.test.js`
- `./scripts/code.sh` to launch locally
