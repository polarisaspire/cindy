"""Release-gate regression for the shipped GLIBC_2.38 SQLite failure.

Separate Python tier: the clean Debian verifier uses only system Python/binutils.
Exercise payload traversal through its production entry, with readelf output as
the external tool boundary; no Electron, containers or real waits in unit tests.
"""
import importlib.util
import pathlib
import subprocess
import tempfile
import unittest

spec = importlib.util.spec_from_file_location(
    "glibc_gate", pathlib.Path(__file__).parents[1] / "check-linux-glibc.py")
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


class PayloadCompatibility(unittest.TestCase):
    def test_nested_native_module_requiring_238_blocks_release(self):
        with tempfile.TemporaryDirectory() as temp:
            root = pathlib.Path(temp)
            module = root / "resources/app.asar.unpacked/node_modules/better-sqlite3/build/Release/better_sqlite3.node"
            module.parent.mkdir(parents=True)
            module.write_bytes(b"\x7fELF")
            with self.assertRaisesRegex(ValueError, "better_sqlite3.node"):
                gate.check_payload(root, lambda _: "Version needs section '.gnu.version_r'\nName: GLIBC_2.38")

    def test_compatible_elf_and_non_elf_payload_pass(self):
        with tempfile.TemporaryDirectory() as temp:
            root = pathlib.Path(temp)
            (root / "cindy").write_bytes(b"\x7fELF")
            (root / "app.asar").write_text("GLIBC_2.38")
            self.assertEqual(gate.check_payload(root, lambda _: (
                "Version definition section\nName: GLIBC_99.0\n"
                "Version needs section '.gnu.version_r'\nName: GLIBC_2.9\nName: GLIBC_2.36")), 1)

    def test_missing_binaries_cannot_pass(self):
        with tempfile.TemporaryDirectory() as temp:
            with self.assertRaisesRegex(ValueError, "No shipped ELF"):
                gate.check_payload(pathlib.Path(temp))

    def test_tool_failure_cannot_skip_a_binary(self):
        with tempfile.TemporaryDirectory() as temp:
            root = pathlib.Path(temp)
            (root / "cindy").write_bytes(b"\x7fELF")
            def failed_readelf(_):
                raise subprocess.CalledProcessError(1, "readelf")
            with self.assertRaises(subprocess.CalledProcessError):
                gate.check_payload(root, failed_readelf)


if __name__ == "__main__":
    unittest.main()
