---
id: memory
title: Memory Troubleshooting
---

Frigate includes built-in memory profiling using [memray](https://bloomberg.github.io/memray/) to help diagnose memory issues. This feature allows you to profile specific Frigate modules to identify memory leaks, excessive allocations, or other memory-related problems.

## Enabling Memory Profiling

Memory profiling is controlled via the `FRIGATE_MEMRAY_MODULES` environment variable. Set it to a comma-separated list of module names you want to profile:

```yaml
# docker-compose example
services:
  frigate:
    ...
    environment:
      - FRIGATE_MEMRAY_MODULES=frigate.embeddings,frigate.capture
```

```bash
# docker run example
docker run -e FRIGATE_MEMRAY_MODULES="frigate.embeddings" \
   ...
   --name frigate <frigate_image>
```

### Module Names

Frigate processes are named using a module-based naming scheme. Common module names include:

- `frigate.review_segment_manager` - Review segment processing
- `frigate.recording_manager` - Recording management
- `frigate.capture` - Camera capture processes (all cameras with this module name)
- `frigate.process` - Camera processing/tracking (all cameras with this module name)
- `frigate.output` - Output processing
- `frigate.audio_manager` - Audio processing
- `frigate.embeddings` - Embeddings processing

You can also specify the full process name (including camera-specific identifiers) if you want to profile a specific camera:

```bash
FRIGATE_MEMRAY_MODULES=frigate.capture:front_door
```

When you specify a module name (e.g., `frigate.capture`), all processes with that module prefix will be profiled. For example, `frigate.capture` will profile all camera capture processes.

## How It Works

1. **Binary File Creation**: When profiling is enabled, memray creates a binary file (`.bin`) in `/config/memray_reports/` that is updated continuously in real-time as the process runs.

2. **Automatic HTML Generation**: On normal process exit, Frigate automatically:

   - Stops memray tracking
   - Generates an HTML flamegraph report
   - Saves it to `/config/memray_reports/<module_name>.html`

3. **Crash Recovery**: If a process crashes (SIGKILL, segfault, etc.), the binary file is preserved with all data up to the crash point. You can manually generate the HTML report from the binary file.

## Viewing Reports

### Automatic Reports

After a process exits normally, you'll find HTML reports in `/config/memray_reports/`. Open these files in a web browser to view interactive flamegraphs showing memory usage patterns.

### Manual Report Generation

If a process crashes or you want to generate a report from an existing binary file, you can manually create the HTML report:

- Run `memray` inside the Frigate container:

```bash
docker-compose exec frigate memray flamegraph /config/memray_reports/<module_name>.bin
# or
docker exec -it <container_name_or_id> memray flamegraph /config/memray_reports/<module_name>.bin
```

- You can also copy the `.bin` file to the host and run `memray` locally if you have it installed:

```bash
docker cp <container_name_or_id>:/config/memray_reports/<module_name>.bin /tmp/
memray flamegraph /tmp/<module_name>.bin
```

## Understanding the Reports

Memray flamegraphs show:

- **Memory allocations over time**: See where memory is being allocated in your code
- **Call stacks**: Understand the full call chain leading to allocations
- **Memory hotspots**: Identify functions or code paths that allocate the most memory
- **Memory leaks**: Spot patterns where memory is allocated but not freed

The interactive HTML reports allow you to:

- Zoom into specific time ranges
- Filter by function names
- View detailed allocation information
- Export data for further analysis

## Best Practices

1. **Profile During Issues**: Enable profiling when you're experiencing memory issues, not all the time, as it adds some overhead.

2. **Profile Specific Modules**: Instead of profiling everything, focus on the modules you suspect are causing issues.

3. **Let Processes Run**: Allow processes to run for a meaningful duration to capture representative memory usage patterns.

4. **Check Binary Files**: If HTML reports aren't generated automatically (e.g., after a crash), check for `.bin` files in `/config/memray_reports/` and generate reports manually.

5. **Compare Reports**: Generate reports at different times to compare memory usage patterns and identify trends.

## Troubleshooting

### No Reports Generated

- Check that the environment variable is set correctly
- Verify the module name matches exactly (case-sensitive)
- Check logs for memray-related errors
- Ensure `/config/memray_reports/` directory exists and is writable

### Process Crashed Before Report Generation

- Look for `.bin` files in `/config/memray_reports/`
- Manually generate HTML reports using: `memray flamegraph <file>.bin`
- The binary file contains all data up to the crash point

### Reports Show No Data

- Ensure the process ran long enough to generate meaningful data
- Check that memray is properly installed (included by default in Frigate)
- Verify the process actually started and ran (check process logs)

For more information about memray and interpreting reports, see the [official memray documentation](https://bloomberg.github.io/memray/).
