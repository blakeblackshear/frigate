"""Utility for parsing size strings."""


def parse_size_to_mb(size_str: str) -> float:
    """Parse a size string to megabytes."""
    size_str = size_str.strip().upper()
    if size_str.endswith("TB"):
        return float(size_str[:-2]) * 1024 * 1024
    elif size_str.endswith("GB"):
        return float(size_str[:-2]) * 1024
    elif size_str.endswith("MB"):
        return float(size_str[:-2])
    elif size_str.endswith("KB"):
        return float(size_str[:-2]) / 1024
    elif size_str.endswith("B"):
        return float(size_str[:-1]) / (1024 * 1024)
    else:
        try:
            return float(size_str)
        except ValueError:
            raise ValueError(f"Invalid size string: {size_str}")
