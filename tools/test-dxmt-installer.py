"""Exercise the installer only against temporary fake CrossOver apps."""
import hashlib
from pathlib import Path
import shutil
import subprocess
import tempfile
import os
import unittest


class InstallerTest(unittest.TestCase):
    def test_copy_integrity_and_rollback_isolation(self):
        with tempfile.TemporaryDirectory(prefix="edhm-dxmt-test-") as tmp:
            root = Path(tmp)
            package = root / "package"
            package.mkdir()
            script = package / "install-dxmt-arm64ec-crossover.sh"
            shutil.copyfile(Path(__file__).with_name(script.name), script)
            app = root / "CrossOver Preview.app"
            relative = Path("Contents/SharedSupport/CrossOver/lib/dxmt")
            modules = [f"aarch64-windows/{name}.dll" for name in
                       ("d3d11", "dxgi", "winemetal", "d3d10core", "nvapi64", "nvngx")]
            modules.append("aarch64-unix/winemetal.so")
            for module in modules:
                for base, content in [(app / relative, b"original"), (package / "dxmt", b"new")]:
                    dest = base / module
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    dest.write_bytes(content)
            checksums = package / "SHA256SUMS"
            checksums.write_text("".join(
                f"{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.relative_to(package)}\n"
                for p in sorted(package.rglob("*")) if p.is_file()))
            env = dict(os.environ, HOME=str(root / "home"))
            result = subprocess.run(["bash", str(script), str(app)], env=env, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            target = Path(env["HOME"]) / "Applications/CrossOver Preview DXMT 50102f99 ARM64EC NVEXT.app"
            for module in modules:
                self.assertEqual((app / relative / module).read_bytes(), b"original")
                self.assertEqual((target / relative / module).read_bytes(), b"new")
            result = subprocess.run(["bash", str(script), str(app)], env=env, capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("Refusing to replace", result.stderr)
            env["HOME"] = str(root / "second-home")
            (package / "dxmt" / modules[0]).write_bytes(b"tampered")
            result = subprocess.run(["bash", str(script), str(app)], env=env, capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertFalse((Path(env["HOME"]) / "Applications").exists())


if __name__ == "__main__":
    unittest.main()
