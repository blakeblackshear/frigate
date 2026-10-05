# GenAI Review Examples

Local example data for `testing-scripts/genai_review_tester.py`.

Each subfolder here should be a copy of a debug output folder saved by
Frigate when `review.genai.debug_save_thumbnails: True` is enabled. Those
folders are written to `clips/genai-requests/<review_id>/` and contain:

- Numbered frame images (`0.jpg`, `1.jpg`, ... or `.webp`) as sent to the
  GenAI provider
- `prompt.txt` with the exact prompt Frigate built for the request
- `response.txt` with the provider's response (not used by the tester)

Copy folders in, optionally rename them to something memorable (for example
`driveway-night-delivery`), then run the tester from the repo root:

```bash
python3 testing-scripts/genai_review_tester.py
```

Everything in this folder except this README is gitignored, since the frames
come from real cameras. Provider settings for the tester are stored here in
`.settings.json`.
