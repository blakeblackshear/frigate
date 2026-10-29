"""Run the unit test suite in parallel groups.

Test modules are split into groups balanced by test count, similar to Home
Assistant's split_tests.py, and each group runs in its own unittest process.

Usage (from the repo root):
    python3 -u -m frigate.test [-j JOBS] [--groups GROUPS] [--timeout SECONDS]
"""

import argparse
import math
import os
import re
import signal
import subprocess
import sys
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
TEST_METHOD = re.compile(r"^\s+(?:async )?def test", re.MULTILINE)
RAN_TESTS = re.compile(r"^Ran (\d+) tests? in", re.MULTILINE)

# Each group pays for its own interpreter and imports, so smaller groups only
# help when there are more cores than groups
TESTS_PER_GROUP = 250


@dataclass
class TestGroup:
    index: int
    modules: list[str] = field(default_factory=list)
    weight: int = 0


@dataclass
class GroupResult:
    group: TestGroup
    returncode: int
    output: str
    duration: float

    @property
    def tests_run(self) -> int:
        match = RAN_TESTS.search(self.output)
        return int(match.group(1)) if match else 0


def discover_modules() -> dict[str, int]:
    """Find test modules the same way unittest discovery does.

    Returns:
        Module name mapped to the number of test methods it defines
    """
    modules: dict[str, int] = {}

    for path in sorted((REPO_ROOT / "frigate").rglob("test*.py")):
        relative = path.relative_to(REPO_ROOT)

        # discovery only descends into packages
        if not all(
            (REPO_ROOT / parent / "__init__.py").exists()
            for parent in relative.parents
            if parent != Path(".")
        ):
            continue

        name = ".".join(relative.with_suffix("").parts)
        modules[name] = len(TEST_METHOD.findall(path.read_text()))

    return modules


def split_groups(modules: dict[str, int], count: int) -> list[TestGroup]:
    """Split modules into groups with a similar number of tests.

    Largest modules are placed first, each into the currently lightest group.
    """
    groups = [TestGroup(index) for index in range(1, count + 1)]

    for name, weight in sorted(modules.items(), key=lambda m: m[1], reverse=True):
        group = min(groups, key=lambda g: g.weight)
        group.modules.append(name)
        group.weight += weight

    return [group for group in groups if group.modules]


def run_group(group: TestGroup, timeout: float) -> GroupResult:
    start = time.monotonic()

    # a file instead of a pipe so a process left behind by a test can't keep
    # the group from finishing by holding the pipe open
    with tempfile.TemporaryFile("w+") as output:
        proc = subprocess.Popen(
            [sys.executable, "-u", "-X", "faulthandler", "-m", "unittest"]
            + group.modules,
            cwd=REPO_ROOT,
            stdout=output,
            stderr=subprocess.STDOUT,
        )
        timed_out = False

        try:
            proc.wait(timeout)
        except subprocess.TimeoutExpired:
            # faulthandler prints the stack of every thread on SIGABRT, which
            # shows where the group is stuck
            timed_out = True
            proc.send_signal(signal.SIGABRT)
            proc.wait()

        output.seek(0)
        text = output.read()

    if timed_out:
        text += f"\nGroup timed out after {timeout:.0f}s\n"

    return GroupResult(group, proc.returncode, text, time.monotonic() - start)


def main() -> int:
    cpus = os.cpu_count() or 1
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "-j",
        "--jobs",
        type=int,
        default=cpus,
        help=f"number of groups to run at once (default: {cpus})",
    )
    parser.add_argument(
        "--groups",
        type=int,
        help=(
            "number of groups to split the tests into (default: one per job, "
            f"or more to keep groups under about {TESTS_PER_GROUP} tests)"
        ),
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=600,
        help="seconds before a group is stopped and reported as failed",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="print the output of passing groups as well as failing ones",
    )
    args = parser.parse_args()

    modules = discover_modules()
    group_count = args.groups or max(
        args.jobs, math.ceil(sum(modules.values()) / TESTS_PER_GROUP)
    )
    groups = split_groups(modules, group_count)
    print(f"Running {len(groups)} test groups with {args.jobs} jobs", flush=True)

    start = time.monotonic()
    failed: list[GroupResult] = []
    total_tests = 0

    with ThreadPoolExecutor(max_workers=args.jobs) as executor:
        futures = [executor.submit(run_group, group, args.timeout) for group in groups]

        for future in as_completed(futures):
            result = future.result()
            total_tests += result.tests_run
            status = "OK" if result.returncode == 0 else "FAILED"
            print(
                f"Group {result.group.index}/{len(groups)}: {status}, "
                f"{result.tests_run} tests in {result.duration:.1f}s",
                flush=True,
            )

            if result.returncode != 0:
                failed.append(result)

            if result.returncode != 0 or args.verbose:
                print(result.output, flush=True)

    print(f"\nRan {total_tests} tests in {time.monotonic() - start:.1f}s")

    if failed:
        print(f"{len(failed)} of {len(groups)} groups FAILED, rerun one with:")

        for result in sorted(failed, key=lambda r: r.group.index):
            print(
                f"  Group {result.group.index}: python3 -u -m unittest "
                f"{' '.join(result.group.modules)}"
            )

        return 1

    print("OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
