#!/usr/bin/env python3
"""ArchLens parser for Python.

Reads a single .py file, finds its static imports, keeps only those that
resolve to something inside the project root, and prints JSON to stdout:

    {"package": str, "dependencies": [str, ...]}
"""
from __future__ import annotations

import argparse
import ast
import json
import sys
from pathlib import Path

STDLIB = getattr(sys, "stdlib_module_names", frozenset())


def within(path: Path, root: Path) -> bool:
    return path == root or root in path.parents


def package_name(target: Path, root: Path) -> str | None:
    """Package containing `target` (a file's directory, or the directory itself).

    '/'-separated path relative to root, '.' for the root. None if outside it.
    """
    pkg_dir = target if target.is_dir() else target.parent
    if not within(pkg_dir, root):
        return None
    return pkg_dir.relative_to(root).as_posix()


def resolve_module(module: str, dirs: list[Path]) -> Path | None:
    """Resolve a dotted module name to a file or directory, or None."""
    if not module:
        return None

    parts = module.split(".")

    for base in dirs:
        # Try full module path first, then try stripping leading parts
        # (e.g., if 'base' is already inside 'src/', strip leading 'src' from module)
        for start_idx in range(len(parts)):
            sub_parts = parts[start_idx:]
            p = base.joinpath(*sub_parts)

            candidates = [p / "__init__.py"]
            if sub_parts:
                candidates.insert(0, p.parent / f"{p.name}.py")

            for c in candidates:
                if c.is_file():
                    return c.resolve()

            # Bare directories (namespace packages)
            if sub_parts and sub_parts[0] not in STDLIB and p.is_dir():
                return p.resolve()

    return None


def resolve_import(name: str, dirs: list[Path]) -> Path | None:
    """`import a.b.c` -> a.b.c if it resolves, else the longest resolving prefix."""
    parts = name.split(".")
    for i in range(len(parts), 0, -1):
        hit = resolve_module(".".join(parts[:i]), dirs)
        if hit is not None:
            return hit
    return None


class ImportCollector(ast.NodeVisitor):
    """Collects internal packages in source order, without duplicates."""

    def __init__(self, root: Path, file_dir: Path):
        self.root = root
        self.file_dir = file_dir

        # Build candidate root lookup directories
        dirs = [file_dir, root]

        # Add root.parent to catch imports starting with the root directory name
        dirs.append(root.parent)

        # Walk up from file_dir to root
        curr = file_dir
        while within(curr, root):
            dirs.append(curr)
            if curr == root:
                break
            curr = curr.parent

        self.abs_dirs = list(dict.fromkeys(dirs))  # dedupe, keep insertion order
        self.deps: dict[str, None] = {}            # insertion-ordered set

    def add(self, hit: Path | None) -> None:
        if hit is None:
            return
        name = package_name(hit, self.root)
        if name is not None:  # None means it resolved outside the root
            self.deps[name] = None

    def visit_Import(self, node: ast.Import) -> None:
        for alias in node.names:
            self.add(resolve_import(alias.name, self.abs_dirs))

    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
        if node.level == 0:
            if not node.module:
                return
            base, dirs = node.module, self.abs_dirs
            base_hit = resolve_module(base, dirs)
        else:
            base_dir = self.file_dir
            for _ in range(node.level - 1):
                base_dir = base_dir.parent
            if not within(base_dir, self.root):
                return  # relative import climbs out of the project
            base, dirs = node.module or "", [base_dir]
            base_hit = resolve_module(base, dirs) if base else base_dir

        for alias in node.names:
            sub = None
            if alias.name != "*":
                sub = resolve_module(f"{base}.{alias.name}" if base else alias.name, dirs)
            self.add(sub or base_hit)


def main() -> int:
    ap = argparse.ArgumentParser(description="ArchLens Python parser")
    ap.add_argument("file", type=Path)
    ap.add_argument("-r", "--root", type=Path, default=Path("."),
                    help="project root used to decide what is internal (default: .)")
    args = ap.parse_args()

    if not STDLIB:
        print("error: Python 3.10+ is required (sys.stdlib_module_names)", file=sys.stderr)
        return 1

    root = args.root.resolve()
    path = args.file.resolve()
    if not root.is_dir():
        print(f"error: root {root} is not a directory", file=sys.stderr)
        return 1
    if not within(path, root):
        print(f"error: {path} is not under root {root}", file=sys.stderr)
        return 1

    try:
        tree = ast.parse(path.read_bytes(), filename=str(path))
    except (SyntaxError, ValueError, OSError, RecursionError) as e:
        print(f"error: cannot parse {path}: {e}", file=sys.stderr)
        return 1

    package = package_name(path, root)

    collector = ImportCollector(root, path.parent)
    collector.visit(tree)
    deps = [d for d in collector.deps if d != package]

    json.dump({"package": package, "dependencies": deps}, sys.stdout)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())