#!/usr/bin/env python3
"""Generate Frigate UI tab content for documentation files.

This script reads YAML code blocks from documentation markdown files and
generates corresponding "Frigate UI" tab instructions based on:
- JSON Schema (from Pydantic config models)
- i18n translation files (for UI field labels)
- Section configs (for hidden/advanced field info)
- Navigation mappings (for Settings UI paths)

Usage:
    # Preview generated UI tabs for a single file
    python docs/scripts/generate_ui_tabs.py docs/docs/configuration/record.md

    # Preview all config docs
    python docs/scripts/generate_ui_tabs.py docs/docs/configuration/

    # Inject UI tabs into files (wraps bare YAML blocks with ConfigTabs)
    python docs/scripts/generate_ui_tabs.py --inject docs/docs/configuration/record.md

    # Regenerate existing UI tabs from current schema/i18n
    python docs/scripts/generate_ui_tabs.py --regenerate docs/docs/configuration/

    # Check for drift between existing UI tabs and what would be generated
    python docs/scripts/generate_ui_tabs.py --check docs/docs/configuration/

    # Write generated files to a temp directory for comparison (originals unchanged)
    python docs/scripts/generate_ui_tabs.py --inject --outdir /tmp/generated docs/docs/configuration/

    # Show detailed warnings and diagnostics
    python docs/scripts/generate_ui_tabs.py --verbose docs/docs/configuration/
"""

import argparse
import difflib
import shutil
import sys
import tempfile
from pathlib import Path

# Ensure frigate package is importable
sys.path.insert(0, str(Path(__file__).resolve().parents[1].parent))

from lib.i18n_loader import load_i18n
from lib.nav_map import ALL_CONFIG_SECTIONS
from lib.schema_loader import load_schema
from lib.section_config_parser import load_section_configs
from lib.ui_generator import generate_ui_content, wrap_with_config_tabs
from lib.yaml_extractor import (
    extract_config_tabs_blocks,
    extract_yaml_blocks,
)


def process_file(
    filepath: Path,
    schema: dict,
    i18n: dict,
    section_configs: dict,
    inject: bool = False,
    verbose: bool = False,
    outpath: Path | None = None,
) -> dict:
    """Process a single markdown file for initial injection of bare YAML blocks.

    Args:
        outpath: If set, write the result here instead of modifying filepath.

    Returns:
        Stats dict with counts of blocks found, generated, skipped, etc.
    """
    content = filepath.read_text()
    blocks = extract_yaml_blocks(content)

    stats = {
        "file": str(filepath),
        "total_blocks": len(blocks),
        "config_blocks": 0,
        "already_wrapped": 0,
        "generated": 0,
        "skipped": 0,
        "warnings": [],
    }

    if not blocks:
        return stats

    # For injection, we need to track replacements
    replacements: list[tuple[int, int, str]] = []

    for block in blocks:
        # Skip non-config YAML blocks
        if block.section_key is None or (
            block.section_key not in ALL_CONFIG_SECTIONS
            and not block.is_camera_level
        ):
            stats["skipped"] += 1
            if verbose and block.config_keys:
                stats["warnings"].append(
                    f"  Line {block.line_start}: Skipped block with keys "
                    f"{block.config_keys} (not a known config section)"
                )
            continue

        stats["config_blocks"] += 1

        # Skip already-wrapped blocks
        if block.inside_config_tabs:
            stats["already_wrapped"] += 1
            if verbose:
                stats["warnings"].append(
                    f"  Line {block.line_start}: Already inside ConfigTabs, skipping"
                )
            continue

        # Generate UI content
        ui_content = generate_ui_content(
            block, schema, i18n, section_configs
        )

        if ui_content is None:
            stats["skipped"] += 1
            if verbose:
                stats["warnings"].append(
                    f"  Line {block.line_start}: Could not generate UI content "
                    f"for section '{block.section_key}'"
                )
            continue

        stats["generated"] += 1

        if inject:
            full_block = wrap_with_config_tabs(
                ui_content, block.raw, block.highlight
            )
            replacements.append((block.line_start, block.line_end, full_block))
        else:
            # Preview mode: print to stdout
            print(f"\n{'='*60}")
            print(f"File: {filepath}")
            print(f"Line {block.line_start}: section={block.section_key}, "
                  f"camera={block.is_camera_level}")
            print(f"{'='*60}")
            print()
            print("--- Generated UI tab ---")
            print(ui_content)
            print()
            print("--- Would produce ---")
            print(wrap_with_config_tabs(ui_content, block.raw, block.highlight))
            print()

    # Apply injections in reverse order (to preserve line numbers)
    if inject and replacements:
        lines = content.split("\n")
        for start, end, replacement in reversed(replacements):
            # start/end are 1-based line numbers
            # The YAML block spans from the ``` line before start to the ``` line at end
            # We need to replace from the opening ``` to the closing ```
            block_start = start - 2  # 0-based index of ```yaml line
            block_end = end - 1  # 0-based index of closing ``` line

            replacement_lines = replacement.split("\n")
            lines[block_start : block_end + 1] = replacement_lines

        new_content = "\n".join(lines)

        # Ensure imports are present
        new_content = _ensure_imports(new_content)

        target = outpath or filepath
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(new_content)
        print(f"  Injected {len(replacements)} ConfigTabs block(s) into {target}")
    elif outpath is not None:
        # No changes but outdir requested -- copy original so the output
        # directory contains a complete set of files for diffing.
        outpath.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(filepath, outpath)

    return stats


def regenerate_file(
    filepath: Path,
    schema: dict,
    i18n: dict,
    section_configs: dict,
    dry_run: bool = False,
    verbose: bool = False,
    outpath: Path | None = None,
) -> dict:
    """Regenerate UI tabs in existing ConfigTabs blocks.

    Strips the current UI tab content and regenerates it from the YAML tab
    using the current schema and i18n data.

    Args:
        outpath: If set, write the result here instead of modifying filepath.

    Returns:
        Stats dict
    """
    content = filepath.read_text()
    tab_blocks = extract_config_tabs_blocks(content)

    stats = {
        "file": str(filepath),
        "total_blocks": len(tab_blocks),
        "regenerated": 0,
        "unchanged": 0,
        "skipped": 0,
        "warnings": [],
    }

    if not tab_blocks:
        return stats

    replacements: list[tuple[int, int, str]] = []

    for tab_block in tab_blocks:
        yaml_block = tab_block.yaml_block

        # Skip non-config blocks
        if yaml_block.section_key is None or (
            yaml_block.section_key not in ALL_CONFIG_SECTIONS
            and not yaml_block.is_camera_level
        ):
            stats["skipped"] += 1
            if verbose:
                stats["warnings"].append(
                    f"  Line {tab_block.line_start}: Skipped (not a config section)"
                )
            continue

        # Generate fresh UI content
        new_ui = generate_ui_content(
            yaml_block, schema, i18n, section_configs
        )

        if new_ui is None:
            stats["skipped"] += 1
            if verbose:
                stats["warnings"].append(
                    f"  Line {tab_block.line_start}: Could not regenerate "
                    f"for section '{yaml_block.section_key}'"
                )
            continue

        # Compare with existing
        existing_ui = tab_block.ui_content
        if _normalize_whitespace(new_ui) == _normalize_whitespace(existing_ui):
            stats["unchanged"] += 1
            if verbose:
                stats["warnings"].append(
                    f"  Line {tab_block.line_start}: Unchanged"
                )
            continue

        stats["regenerated"] += 1

        new_full = wrap_with_config_tabs(
            new_ui, yaml_block.raw, yaml_block.highlight
        )
        replacements.append(
            (tab_block.line_start, tab_block.line_end, new_full)
        )

        if dry_run or verbose:
            print(f"\n{'='*60}")
            print(f"File: {filepath}, line {tab_block.line_start}")
            print(f"Section: {yaml_block.section_key}")
            print(f"{'='*60}")
            _print_diff(existing_ui, new_ui, filepath, tab_block.line_start)

    # Apply replacements
    if not dry_run and replacements:
        lines = content.split("\n")
        for start, end, replacement in reversed(replacements):
            block_start = start - 1  # 0-based index of <ConfigTabs> line
            block_end = end - 1  # 0-based index of </ConfigTabs> line
            replacement_lines = replacement.split("\n")
            lines[block_start : block_end + 1] = replacement_lines

        new_content = "\n".join(lines)
        target = outpath or filepath
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(new_content)
        print(
            f"  Regenerated {len(replacements)} ConfigTabs block(s) in {target}",
            file=sys.stderr,
        )
    elif outpath is not None:
        outpath.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(filepath, outpath)

    return stats


def check_file(
    filepath: Path,
    schema: dict,
    i18n: dict,
    section_configs: dict,
    verbose: bool = False,
) -> dict:
    """Check for drift between existing UI tabs and what would be generated.

    Returns:
        Stats dict with drift info. Non-zero "drifted" means the file is stale.
    """
    content = filepath.read_text()
    tab_blocks = extract_config_tabs_blocks(content)

    stats = {
        "file": str(filepath),
        "total_blocks": len(tab_blocks),
        "up_to_date": 0,
        "drifted": 0,
        "skipped": 0,
        "warnings": [],
    }

    if not tab_blocks:
        return stats

    for tab_block in tab_blocks:
        yaml_block = tab_block.yaml_block

        if yaml_block.section_key is None or (
            yaml_block.section_key not in ALL_CONFIG_SECTIONS
            and not yaml_block.is_camera_level
        ):
            stats["skipped"] += 1
            continue

        new_ui = generate_ui_content(
            yaml_block, schema, i18n, section_configs
        )

        if new_ui is None:
            stats["skipped"] += 1
            continue

        existing_ui = tab_block.ui_content
        if _normalize_whitespace(new_ui) == _normalize_whitespace(existing_ui):
            stats["up_to_date"] += 1
        else:
            stats["drifted"] += 1
            print(f"\n{'='*60}")
            print(f"DRIFT: {filepath}, line {tab_block.line_start}")
            print(f"Section: {yaml_block.section_key}")
            print(f"{'='*60}")
            _print_diff(existing_ui, new_ui, filepath, tab_block.line_start)

    return stats


def _normalize_whitespace(text: str) -> str:
    """Normalize whitespace for comparison (strip lines, collapse blanks)."""
    lines = [line.rstrip() for line in text.strip().splitlines()]
    # Collapse multiple blank lines into one
    result: list[str] = []
    prev_blank = False
    for line in lines:
        if line == "":
            if not prev_blank:
                result.append(line)
            prev_blank = True
        else:
            result.append(line)
            prev_blank = False
    return "\n".join(result)


def _print_diff(existing: str, generated: str, filepath: Path, line: int):
    """Print a unified diff between existing and generated UI content."""
    existing_lines = existing.strip().splitlines(keepends=True)
    generated_lines = generated.strip().splitlines(keepends=True)

    diff = difflib.unified_diff(
        existing_lines,
        generated_lines,
        fromfile=f"{filepath}:{line} (existing)",
        tofile=f"{filepath}:{line} (generated)",
        lineterm="",
    )
    diff_text = "\n".join(diff)
    if diff_text:
        print(diff_text)
    else:
        print("  (whitespace-only difference)")


def _ensure_imports(content: str) -> str:
    """Ensure ConfigTabs/TabItem/NavPath imports are present in the file."""
    lines = content.split("\n")

    needed_imports = []
    if "<ConfigTabs>" in content and 'import ConfigTabs' not in content:
        needed_imports.append(
            'import ConfigTabs from "@site/src/components/ConfigTabs";'
        )
    if "<TabItem" in content and 'import TabItem' not in content:
        needed_imports.append('import TabItem from "@theme/TabItem";')
    if "<NavPath" in content and 'import NavPath' not in content:
        needed_imports.append(
            'import NavPath from "@site/src/components/NavPath";'
        )

    if not needed_imports:
        return content

    # Insert imports after frontmatter (---)
    insert_idx = 0
    frontmatter_count = 0
    for i, line in enumerate(lines):
        if line.strip() == "---":
            frontmatter_count += 1
            if frontmatter_count == 2:
                insert_idx = i + 1
                break

    # Add blank line before imports if needed
    import_block = [""] + needed_imports + [""]
    lines[insert_idx:insert_idx] = import_block

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(
        description="Generate Frigate UI tab content for documentation files"
    )
    parser.add_argument(
        "paths",
        nargs="+",
        type=Path,
        help="Markdown file(s) or directory to process",
    )

    mode_group = parser.add_mutually_exclusive_group()
    mode_group.add_argument(
        "--inject",
        action="store_true",
        help="Inject generated content into files (wraps bare YAML blocks)",
    )
    mode_group.add_argument(
        "--regenerate",
        action="store_true",
        help="Regenerate UI tabs in existing ConfigTabs from current schema/i18n",
    )
    mode_group.add_argument(
        "--check",
        action="store_true",
        help="Check for drift between existing UI tabs and current schema/i18n (exit 1 if drifted)",
    )

    parser.add_argument(
        "--outdir",
        type=Path,
        default=None,
        help="Write output files to this directory instead of modifying originals. "
        "Mirrors the source directory structure. Use with --inject or --regenerate.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="With --regenerate, show diffs but don't write files",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Show detailed warnings and diagnostics",
    )
    args = parser.parse_args()

    # Collect files and determine base directory for relative path computation
    files: list[Path] = []
    base_dirs: list[Path] = []
    for p in args.paths:
        if p.is_dir():
            files.extend(sorted(p.glob("**/*.md")))
            base_dirs.append(p.resolve())
        elif p.is_file():
            files.append(p)
            base_dirs.append(p.resolve().parent)
        else:
            print(f"Warning: {p} not found, skipping", file=sys.stderr)

    if not files:
        print("No markdown files found", file=sys.stderr)
        sys.exit(1)

    # Use the first input path's directory as the base for relative paths
    base_dir = base_dirs[0] if base_dirs else Path.cwd()

    # Resolve outdir: create a temp directory if --outdir is given without a path
    outdir: Path | None = args.outdir
    created_tmpdir = False
    if outdir is not None:
        if str(outdir) == "auto":
            outdir = Path(tempfile.mkdtemp(prefix="frigate-ui-tabs-"))
            created_tmpdir = True
        outdir.mkdir(parents=True, exist_ok=True)

    # Build file->outpath mapping
    file_outpaths: dict[Path, Path | None] = {}
    for f in files:
        if outdir is not None:
            try:
                rel = f.resolve().relative_to(base_dir)
            except ValueError:
                rel = Path(f.name)
            file_outpaths[f] = outdir / rel
        else:
            file_outpaths[f] = None

    # Load data sources
    print("Loading schema from Pydantic models...", file=sys.stderr)
    schema = load_schema()
    print("Loading i18n translations...", file=sys.stderr)
    i18n = load_i18n()
    print("Loading section configs...", file=sys.stderr)
    section_configs = load_section_configs()
    print(f"Processing {len(files)} file(s)...\n", file=sys.stderr)

    if args.check:
        _run_check(files, schema, i18n, section_configs, args.verbose)
    elif args.regenerate:
        _run_regenerate(
            files, schema, i18n, section_configs,
            args.dry_run, args.verbose, file_outpaths,
        )
    else:
        _run_inject(
            files, schema, i18n, section_configs,
            args.inject, args.verbose, file_outpaths,
        )

    if outdir is not None:
        print(f"\nOutput written to: {outdir}", file=sys.stderr)


def _run_inject(files, schema, i18n, section_configs, inject, verbose, file_outpaths):
    """Run default mode: preview or inject bare YAML blocks."""
    total_stats = {
        "files": 0,
        "total_blocks": 0,
        "config_blocks": 0,
        "already_wrapped": 0,
        "generated": 0,
        "skipped": 0,
    }

    for filepath in files:
        stats = process_file(
            filepath, schema, i18n, section_configs,
            inject=inject, verbose=verbose,
            outpath=file_outpaths.get(filepath),
        )

        total_stats["files"] += 1
        for key in ["total_blocks", "config_blocks", "already_wrapped",
                     "generated", "skipped"]:
            total_stats[key] += stats[key]

        if verbose and stats["warnings"]:
            print(f"\n{filepath}:", file=sys.stderr)
            for w in stats["warnings"]:
                print(w, file=sys.stderr)

    print("\n" + "=" * 60, file=sys.stderr)
    print("Summary:", file=sys.stderr)
    print(f"  Files processed:     {total_stats['files']}", file=sys.stderr)
    print(f"  Total YAML blocks:   {total_stats['total_blocks']}", file=sys.stderr)
    print(f"  Config blocks:       {total_stats['config_blocks']}", file=sys.stderr)
    print(f"  Already wrapped:     {total_stats['already_wrapped']}", file=sys.stderr)
    print(f"  Generated:           {total_stats['generated']}", file=sys.stderr)
    print(f"  Skipped:             {total_stats['skipped']}", file=sys.stderr)
    print("=" * 60, file=sys.stderr)


def _run_regenerate(files, schema, i18n, section_configs, dry_run, verbose, file_outpaths):
    """Run regenerate mode: update existing ConfigTabs blocks."""
    total_stats = {
        "files": 0,
        "total_blocks": 0,
        "regenerated": 0,
        "unchanged": 0,
        "skipped": 0,
    }

    for filepath in files:
        stats = regenerate_file(
            filepath, schema, i18n, section_configs,
            dry_run=dry_run, verbose=verbose,
            outpath=file_outpaths.get(filepath),
        )

        total_stats["files"] += 1
        for key in ["total_blocks", "regenerated", "unchanged", "skipped"]:
            total_stats[key] += stats[key]

        if verbose and stats["warnings"]:
            print(f"\n{filepath}:", file=sys.stderr)
            for w in stats["warnings"]:
                print(w, file=sys.stderr)

    action = "Would regenerate" if dry_run else "Regenerated"
    print("\n" + "=" * 60, file=sys.stderr)
    print("Summary:", file=sys.stderr)
    print(f"  Files processed:     {total_stats['files']}", file=sys.stderr)
    print(f"  ConfigTabs blocks:   {total_stats['total_blocks']}", file=sys.stderr)
    print(f"  {action}:    {total_stats['regenerated']}", file=sys.stderr)
    print(f"  Unchanged:           {total_stats['unchanged']}", file=sys.stderr)
    print(f"  Skipped:             {total_stats['skipped']}", file=sys.stderr)
    print("=" * 60, file=sys.stderr)


def _run_check(files, schema, i18n, section_configs, verbose):
    """Run check mode: detect drift without modifying files."""
    total_stats = {
        "files": 0,
        "total_blocks": 0,
        "up_to_date": 0,
        "drifted": 0,
        "skipped": 0,
    }

    for filepath in files:
        stats = check_file(
            filepath, schema, i18n, section_configs, verbose=verbose,
        )

        total_stats["files"] += 1
        for key in ["total_blocks", "up_to_date", "drifted", "skipped"]:
            total_stats[key] += stats[key]

    print("\n" + "=" * 60, file=sys.stderr)
    print("Summary:", file=sys.stderr)
    print(f"  Files processed:     {total_stats['files']}", file=sys.stderr)
    print(f"  ConfigTabs blocks:   {total_stats['total_blocks']}", file=sys.stderr)
    print(f"  Up to date:          {total_stats['up_to_date']}", file=sys.stderr)
    print(f"  Drifted:             {total_stats['drifted']}", file=sys.stderr)
    print(f"  Skipped:             {total_stats['skipped']}", file=sys.stderr)
    print("=" * 60, file=sys.stderr)

    if total_stats["drifted"] > 0:
        print(
            f"\n{total_stats['drifted']} block(s) have drifted from schema/i18n. "
            "Run with --regenerate to update.",
            file=sys.stderr,
        )
        sys.exit(1)
    else:
        print("\nAll UI tabs are up to date.", file=sys.stderr)


if __name__ == "__main__":
    main()
