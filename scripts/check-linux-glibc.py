"""Fail publication when any shipped ELF requires glibc newer than Debian 12.

Scan the installed payload, including .node files and helpers outside app.asar;
checking only the Electron executable misses better-sqlite3's native rebuild.
"""
import pathlib
import re
import subprocess
import sys


def required_versions(version_info):
    # readelf's version-needs records, not version-definition records.
    needs = version_info.split("Version needs section", 1)
    if len(needs) == 1:
        return []
    return [tuple(map(int, value.split("."))) for value in
            re.findall(r"\bName: GLIBC_([0-9]+(?:\.[0-9]+)+)\b", needs[1])]


def check_payload(root, read_versions=None):
    if read_versions is None:
        def read_versions(file):
            return subprocess.run(["readelf", "--version-info", "--wide", str(file)],
                                  check=True, capture_output=True, text=True).stdout
    count = 0
    incompatible = []
    for file in sorted(pathlib.Path(root).rglob("*")):
        if file.is_symlink() or not file.is_file():
            continue
        with file.open("rb") as stream:
            if stream.read(4) != b"\x7fELF":
                continue
        count += 1
        versions = required_versions(read_versions(file))
        if any(version > (2, 36) for version in versions):
            incompatible.append(str(file.relative_to(root)))
    if not count:
        raise ValueError("No shipped ELF binaries found")
    if incompatible:
        raise ValueError("Requires glibc newer than 2.36: " + ", ".join(incompatible))
    return count


if __name__ == "__main__":
    print(f"Debian 12 glibc compatibility: {check_payload(sys.argv[1])} ELF files passed")
