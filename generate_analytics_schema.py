"""Generate the analytics report JSON Schema from the Pydantic models.

The committed docs/static/frigate-analytics-schema.json documents every field
for the ingest Worker's aggregation job and the docs page. It is exact for this
version only, so the Worker validates just the envelope against it. Never edit
it by hand, and never run a formatter over it.

Usage (from the repository root):

    python3 generate_analytics_schema.py            # write the schema
    python3 generate_analytics_schema.py --check    # CI guard: fail if stale
"""

import argparse
import json
import sys
from pathlib import Path

from frigate.analytics.schema import SCHEMA_VERSION, AnalyticsReport

OUTPUT = Path(__file__).parent / "docs" / "static" / "frigate-analytics-schema.json"


def render() -> str:
    schema = AnalyticsReport.model_json_schema()
    schema["$schema"] = "https://json-schema.org/draft/2020-12/schema"
    schema["$id"] = "https://docs.frigate.video/frigate-analytics-schema.json"
    schema["x-schema-version"] = SCHEMA_VERSION
    return json.dumps(schema, indent=2, sort_keys=True) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--check", action="store_true", help="fail if the committed schema is stale"
    )
    args = parser.parse_args()
    rendered = render()

    if args.check:
        current = OUTPUT.read_text() if OUTPUT.exists() else ""

        if current != rendered:
            print(
                f"{OUTPUT} is out of date, run python3 generate_analytics_schema.py",
                file=sys.stderr,
            )
            return 1

        print(f"{OUTPUT} is up to date")
        return 0

    OUTPUT.write_text(rendered)
    print(f"Wrote {OUTPUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
