# Inbound

Drop files here for agents to pick up (models, sounds, references). Not built or deployed.

## Sketchfab models

On your computer, from your clone of the repository:

```
python3 tools/assets/sketchfab-bulk-download.py      # asks for your Sketchfab API token (hidden), fetches all 39
git add inbound/sketchfab && git commit -m "Sketchfab sources" && git push
```

They land in `inbound/sketchfab/<id>/`; `node tools/assets/import-sketchfab.mjs` picks them up from there.
