# Decrypting notes

This repo contains encrypted note blobs and a salt. To decrypt notes into Markdown files, use the included script with your passphrase.

## Requirements

- Node.js (no extra dependencies; script uses built-ins only)

## Usage

Run from this directory (the repo root):

```bash
# Passphrase via environment (recommended)
PAPEL_PASSPHRASE=your-passphrase node decrypt-notes.mjs

# Or via argument
node decrypt-notes.mjs --passphrase=your-passphrase
```

Decrypted notes are written into the `decrypted/` directory as Markdown files (one per note; filename from note title). The script prints how many notes were decrypted.

## Options

- **Data directory** – Default is the current directory. Override with:
  - `PAPEL_DATA_DIR=/path/to/repo node decrypt-notes.mjs`
  - `node decrypt-notes.mjs --data-dir=/path/to/repo`
