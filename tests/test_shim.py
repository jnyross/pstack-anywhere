import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CLI = ROOT / "bin" / "pstack-anywhere"


def run(*args, home, project=None):
    env = os.environ.copy()
    env["HOME"] = str(home)
    command = [str(CLI), *args]
    if project:
        command += ["--project-dir", str(project)]
    return subprocess.run(command, env=env, text=True, capture_output=True, check=False)


class ShimTests(unittest.TestCase):
    def test_adapter_schema_and_artifacts(self):
        adapters = list((ROOT / "adapters").glob("*.json"))
        self.assertEqual(len(adapters), 9)
        skills = list((ROOT / "skills").glob("*/SKILL.md"))
        for path in adapters:
            data = json.loads(path.read_text())
            for key in ("name", "skills", "command", "instruction", "capabilities"):
                self.assertIn(key, data)
            self.assertEqual(data["name"], path.stem)
            self.assertTrue(skills)

    def test_round_trip_and_idempotence(self):
        with tempfile.TemporaryDirectory() as td:
            home = Path(td) / "home"
            home.mkdir()
            before = sorted(str(p.relative_to(home)) for p in home.rglob("*"))
            first = run("install", "--host", "claude-code", "--scope", "user", home=home)
            self.assertEqual(first.returncode, 0, first.stderr)
            installed = sorted((str(p.relative_to(home)), p.read_bytes()) for p in home.rglob("*") if p.is_file())
            second = run("install", "--host", "claude-code", "--scope", "user", home=home)
            self.assertEqual(second.returncode, 0, second.stderr)
            again = sorted((str(p.relative_to(home)), p.read_bytes()) for p in home.rglob("*") if p.is_file())
            self.assertEqual(installed, again)
            removed = run("uninstall", "--host", "claude-code", "--scope", "user", home=home)
            self.assertEqual(removed.returncode, 0, removed.stderr)
            self.assertEqual(before, sorted(str(p.relative_to(home)) for p in home.rglob("*")))

    def test_marker_replacement_preserves_surrounding_content(self):
        with tempfile.TemporaryDirectory() as td:
            home = Path(td) / "home"
            instruction = home / "CLAUDE.md"
            home.mkdir()
            instruction.write_text("before\n\n" + "<!-- BEGIN pstack-anywhere -->\nold\n<!-- END pstack-anywhere -->\n\n" + "after\n")
            result = run("install", "--host", "claude-code", home=home)
            self.assertEqual(result.returncode, 0, result.stderr)
            text = instruction.read_text()
            self.assertEqual(text.count("BEGIN pstack-anywhere"), 1)
            self.assertIn("before", text)
            self.assertIn("after", text)
            run("uninstall", "--host", "claude-code", home=home)
            self.assertEqual(instruction.read_text(), "before\n\nafter")

    def test_pointer_description_and_absolute_path(self):
        with tempfile.TemporaryDirectory() as td:
            home = Path(td) / "home"
            project = Path(td) / "project"
            home.mkdir()
            project.mkdir()
            result = run("install", "--host", "gemini-cli", "--scope", "project", home=home, project=project)
            self.assertEqual(result.returncode, 0, result.stderr)
            pointer = project / ".gemini/commands/setup-pstack.toml"
            text = pointer.read_text()
            self.assertIn("Configure which models pstack uses", text)
            self.assertIn(str(ROOT / "skills/setup-pstack/SKILL.md"), text)
            self.assertTrue(Path(ROOT / "skills/setup-pstack/SKILL.md").is_absolute())

    def test_path_rewrite_including_shell_script(self):
        with tempfile.TemporaryDirectory() as td:
            home = Path(td) / "home"
            project = Path(td) / "project"
            home.mkdir()
            project.mkdir()
            result = run("install", "--host", "codex", "--scope", "project", home=home, project=project)
            self.assertEqual(result.returncode, 0, result.stderr)
            copied = project / ".agents/skills/poteto-mode/scripts/worktree-audit.sh"
            text = copied.read_text()
            self.assertNotIn("~/.cursor/", text)
            self.assertIn("transcript history unavailable", text)


if __name__ == "__main__":
    unittest.main()
