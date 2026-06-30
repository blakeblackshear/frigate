import argparse
import json
import os

parser = argparse.ArgumentParser(description="Install CDI on Dragonwing IoT boards")
parser.add_argument("--file", type=str, required=True, help="CDI input file")
args, unknown = parser.parse_known_args()

if os.path.exists("/etc/cdi/cdi-hw-acc.json"):
    print("/etc/cdi/cdi-hw-acc.json already exists. Remove it first before continuing.")
    exit(1)

if not os.path.exists(args.file):
    print(f"{args.file} (via --file) does not exist")
    exit(1)

# Check if directory exists
if not os.path.exists("/etc/cdi"):
    # Check if we can create it in /etc
    if not os.access(os.path.dirname("/etc/cdi"), os.W_OK):
        print(
            f"{os.path.dirname('/etc/cdi')} is not writable. Re-run this script with sudo."
        )
        exit(1)
    os.mkdir("/etc/cdi")
else:
    # Directory exists → check if writable
    if not os.access("/etc/cdi", os.W_OK):
        print("/etc/cdi is not writable. Re-run this script with sudo.")
        exit(1)

with open(args.file, "r") as f:
    cdi = json.loads(f.read())

print("Finding missing mount paths...")
for device in cdi["devices"]:
    new_mounts = []

    for mount in device["containerEdits"]["mounts"]:
        if not os.path.exists(mount["hostPath"]):
            print(f"    Missing {mount['hostPath']}")
        else:
            new_mounts.append(mount)

    device["containerEdits"]["mounts"] = new_mounts

print("")
print("Writing to /etc/cdi/cdi-hw-acc.json...")
with open("/etc/cdi/cdi-hw-acc.json", "w") as f:
    f.write(json.dumps(cdi, indent=4))
print("Writing to /etc/cdi/cdi-hw-acc.json OK")
