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
import threading
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

# Each group runs in its own process group, which ctrl+c in the terminal does
# not reach, so the runner passes the interrupt on to these
interrupted = threading.Event()
running_groups: set[int] = set()


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
        """Number of tests unittest reported running, 0 if it never finished."""
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


def signal_group(pgid: int, sig: signal.Signals) -> bool:
    """Send a signal to every process in a process group.

    Returns:
        False if no process is left in the group
    """
    try:
        os.killpg(pgid, sig)
    except ProcessLookupError:
        return False

    return True


def stop_group(pgid: int) -> None:
    """Stop the processes a group's tests left running.

    They get a moment to exit before being killed, so the multiprocessing
    resource tracker, which ignores SIGTERM, can remove leaked shared memory
    once the processes holding it have exited.
    """
    if signal_group(pgid, signal.SIGTERM):
        time.sleep(2)
        signal_group(pgid, signal.SIGKILL)


def run_group(group: TestGroup, timeout: float) -> GroupResult:
    """Run a group's modules in a unittest process of its own.

    Args:
        group: The modules to run
        timeout: Seconds before the group is stopped

    Returns:
        The exit code and combined output of the unittest process
    """
    start = time.monotonic()

    # a file instead of a pipe so a process left behind by a test can't keep
    # the group from finishing by holding the pipe open
    with tempfile.TemporaryFile("w+") as output:
        proc = subprocess.Popen(
            [sys.executable, "-u", "-X", "faulthandler", "-m", "unittest"]
            + group.modules,
            cwd=REPO_ROOT,
            # a group in the background that read the terminal would be
            # stopped, and a stopped process doesn't act on SIGABRT
            stdin=subprocess.DEVNULL,
            stdout=output,
            stderr=subprocess.STDOUT,
            # a process group of its own so the processes its tests start can
            # be stopped with it
            process_group=0,
        )
        running_groups.add(proc.pid)

        # the runner may have been interrupted while this group was starting
        if interrupted.is_set():
            signal_group(proc.pid, signal.SIGINT)

        timed_out = False

        try:
            proc.wait(timeout)
        except subprocess.TimeoutExpired:
            # faulthandler prints the stack of every thread on SIGABRT, which
            # shows where the group is stuck
            timed_out = True
            proc.send_signal(signal.SIGABRT)
            proc.wait()

            # aborting skips the cleanup of the running test, which would
            # have stopped the processes it started
            stop_group(proc.pid)

        running_groups.discard(proc.pid)
        output.seek(0)
        text = output.read()

    if timed_out:
        text += f"\nGroup timed out after {timeout:.0f}s\n"

    return GroupResult(group, proc.returncode, text, time.monotonic() - start)


def main() -> int:
    """Split the tests into groups, run them in parallel, and report the results.

    Returns:
        The exit code, 1 if any group failed
    """
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

        try:
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
        except KeyboardInterrupt:
            interrupted.set()
            executor.shutdown(wait=False, cancel_futures=True)

            for pgid in list(running_groups):
                signal_group(pgid, signal.SIGINT)

            raise

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
