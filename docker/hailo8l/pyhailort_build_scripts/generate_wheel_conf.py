import json
import os
import platform
import sys
import sysconfig


def extract_toolchain_info(compiler):
    # Remove the "-gcc" or "-g++" suffix if present
    if compiler.endswith("-gcc") or compiler.endswith("-g++"):
        compiler = compiler.rsplit("-", 1)[0]

    # Extract the toolchain and ABI part (e.g., "gnu")
    toolchain_parts = compiler.split("-")
    abi_conventions = next(
        (part for part in toolchain_parts if part in ["gnu", "musl", "eabi", "uclibc"]),
        "",
    )

    return abi_conventions


def generate_wheel_conf():
    conf_file_path = os.path.join(
        os.path.abspath(os.path.dirname(__file__)), "wheel_conf.json"
    )

    # Extract current system and Python version information
    py_version = f"cp{sys.version_info.major}{sys.version_info.minor}"
    arch = platform.machine()
    system = platform.system().lower()
    libc_version = platform.libc_ver()[1]

    # Get the compiler information
    compiler = sysconfig.get_config_var("CC")
    abi_conventions = extract_toolchain_info(compiler)

    # Create the new configuration data
    new_conf_data = {
        "py_version": py_version,
        "arch": arch,
        "system": system,
        "libc_version": libc_version,
        "abi": abi_conventions,
        "extension": {
            "posix": "so",
            "nt": "pyd",  # Windows
        }[os.name],
    }

    # If the file exists, load the existing data
    if os.path.isfile(conf_file_path):
        with open(conf_file_path, "r") as conf_file:
            conf_data = json.load(conf_file)
        # Update the existing data with the new data
        conf_data.update(new_conf_data)
    else:
        # If the file does not exist, use the new data
        conf_data = new_conf_data

    # Write the updated data to the file
    with open(conf_file_path, "w") as conf_file:
        json.dump(conf_data, conf_file, indent=4)


if __name__ == "__main__":
    generate_wheel_conf()
