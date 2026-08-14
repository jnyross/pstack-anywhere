import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CLI = ROOT / "bin/pstack-anywhere"
HOSTS = sorted(p.stem for p in (ROOT / "adapters").glob("*.json"))
FORMATS = {"toml", "copilot", "markdown"}


def run(*args, home, project=None):
    env = os.environ.copy()
    env["HOME"] = str(home)
    command = [str(CLI), *args]
    if project:
        command += ["--project-dir", str(project)]
    return subprocess.run(command, env=env, text=True, capture_output=True, check=False)


class ShimTests(unittest.TestCase):
    def test_adapter_schema(self):
        required = {"name", "display_name", "skills", "command", "instruction", "model_config",
                    "probes", "rewrites", "capabilities"}
        optional = {"instruction_fallback_user"}
        for path in (ROOT / "adapters").glob("*.json"):
            data = json.loads(path.read_text())
            self.assertTrue(set(data) <= required | optional)
            self.assertTrue(required <= set(data))
            self.assertEqual(data["name"], path.stem)
            for key in ("skills", "command", "instruction", "model_config"):
                self.assertTrue(set(data[key]) >= {"user", "project"})
            self.assertIn(data["skills"]["mode"], {"native", "pointer"})
            self.assertIn(data["command"]["format"], FORMATS)
            for scope in ("user", "project"):
                self.assertIsInstance(data["probes"][scope], list)
            self.assertTrue(data["rewrites"])
            self.assertTrue(data["capabilities"])

    def test_every_skill_has_artifacts_for_each_applicable_scope(self):
        skills = list((ROOT / "skills").glob("*/SKILL.md"))
        with tempfile.TemporaryDirectory() as td:
            home, project = Path(td) / "home", Path(td) / "project"
            home.mkdir()
            project.mkdir()
            for host in HOSTS:
                adapter = json.loads((ROOT / "adapters" / f"{host}.json").read_text())
                for scope in ("user", "project"):
                    if not (adapter["skills"][scope] or adapter["command"][scope]):
                        continue
                    result = run("install", "--host", host, "--scope", scope, home=home, project=project)
                    self.assertEqual(result.returncode, 0, (host, scope, result.stderr))
                    target = home if scope == "user" else project
                    self.assertGreaterEqual(sum(1 for value in target.rglob("*") if value.is_file()), len(skills))
                    run("uninstall", "--host", host, "--scope", scope, home=home, project=project)

    def test_refresh_force_and_unrelated_files(self):
        with tempfile.TemporaryDirectory() as td:
            home = Path(td) / "home"
            home.mkdir()
            unowned = home / ".claude/skills/architect"
            unowned.mkdir(parents=True)
            (unowned / "sentinel").write_text("keep")
            self.assertEqual(run("install", "--host", "claude-code", home=home).returncode, 0)
            self.assertEqual((unowned / "sentinel").read_text(), "keep")
            self.assertEqual(run("install", "--host", "claude-code", "--force", home=home).returncode, 0)
            self.assertFalse((unowned / "sentinel").exists())
            owned = home / ".claude/skills/setup-pstack/SKILL.md"
            owned.write_text("changed")
            run("install", "--host", "claude-code", home=home)
            self.assertIn("Configure which models", owned.read_text())
            unrelated = home / ".claude/unrelated.txt"
            unrelated.write_text("preserve")
            run("uninstall", "--host", "claude-code", home=home)
            self.assertTrue(unrelated.exists())

    def test_marker_replacement_and_no_marker(self):
        with tempfile.TemporaryDirectory() as td:
            home = Path(td) / "home"
            home.mkdir()
            instruction = home / ".claude/CLAUDE.md"
            instruction.parent.mkdir(parents=True)
            instruction.write_text("before\n\n<!-- BEGIN pstack-anywhere -->\nold\n<!-- END pstack-anywhere -->\n\nafter\n")
            run("install", "--host", "claude-code", home=home)
            text = instruction.read_text()
            self.assertEqual(text.count("BEGIN pstack-anywhere"), 1)
            self.assertIn("before", text)
            self.assertIn("after", text)
            run("uninstall", "--host", "claude-code", home=home)
            self.assertEqual(instruction.read_text(), "before\n\nafter\n")
            instruction.write_text("only surrounding content\n")
            run("install", "--host", "claude-code", home=home)
            self.assertEqual(instruction.read_text().count("BEGIN pstack-anywhere"), 1)

    def test_pointers_rewrite_paths_and_shell_scripts_parse(self):
        with tempfile.TemporaryDirectory() as td:
            home, project = Path(td) / "home", Path(td) / "project"
            home.mkdir()
            project.mkdir()
            for host in ("claude-code", "codex", "gemini-cli", "copilot", "windsurf", "cline", "opencode"):
                result = run("install", "--host", host, "--scope", "project", home=home, project=project)
                self.assertEqual(result.returncode, 0, result.stderr)
                for path in project.rglob("*"):
                    if path.is_file():
                        text = path.read_text(errors="replace")
                        self.assertNotIn(".cursor/", text, path)
                        self.assertNotIn("$HOME", text, path)
                        self.assertNotIn("$PSTACK_", text, path)
                        self.assertNotRegex(text, r"(?:~|/)[^`\n ]*pstack-anywhere-unavailable[^`\n ]*", path)
                        self.assertNotIn("filepstack-models.mdc", text, path)
                        self.assertNotIn("configuration filepstack", text, path)
                run("uninstall", "--host", host, "--scope", "project", home=home, project=project)
            run("install", "--host", "codex", "--scope", "project", home=home, project=project)
            for script in (project / ".agents/skills").rglob("*.sh"):
                self.assertEqual(subprocess.run(["bash", "-n", str(script)]).returncode, 0, script)

    def test_shared_pointer_staging_survives_scope_uninstall(self):
        with tempfile.TemporaryDirectory() as td:
            home, project = Path(td) / "home", Path(td) / "project"
            home.mkdir()
            project.mkdir()
            self.assertEqual(run("install", "--host", "gemini-cli", "--scope", "user",
                                 home=home, project=project).returncode, 0)
            self.assertEqual(run("install", "--host", "gemini-cli", "--scope", "project",
                                 home=home, project=project).returncode, 0)
            staging = home / ".local/share/pstack-anywhere/gemini-cli/skills"
            self.assertTrue(staging.exists())
            run("uninstall", "--host", "gemini-cli", "--scope", "user", home=home, project=project)
            self.assertTrue(staging.exists())
            pointer = project / ".gemini/commands/setup-pstack.toml"
            self.assertTrue(pointer.exists())
            self.assertIn(str(staging), pointer.read_text())
            run("uninstall", "--host", "gemini-cli", "--scope", "project", home=home, project=project)
            self.assertFalse(staging.exists())

    def test_unavailable_capability_notice_is_derived_and_idempotent(self):
        begin = "<!-- BEGIN pstack-anywhere unavailable-capability notice -->"
        with tempfile.TemporaryDirectory() as td:
            home, project = Path(td) / "home", Path(td) / "project"
            home.mkdir()
            project.mkdir()
            for _ in range(2):
                result = run("install", "--host", "claude-code", "--scope", "project",
                             home=home, project=project)
                self.assertEqual(result.returncode, 0, result.stderr)
            recall = project / ".claude/skills/recall/SKILL.md"
            reflect = project / ".claude/skills/reflect/SKILL.md"
            setup = project / ".claude/skills/setup-pstack/SKILL.md"
            for path in (recall, reflect):
                text = path.read_text()
                self.assertEqual(text.count(begin), 1, path)
                self.assertIn("cannot run on this host", text)
                self.assertIn("Transcript history is unavailable on this host", text)
                self.assertNotIn("__PSTACK_UNAVAILABLE_TRANSCRIPTS__", text)
                self.assertNotRegex(text, r"(?:~|/)[^`\n ]*pstack-anywhere-unavailable[^`\n ]*")
            self.assertNotIn(begin, setup.read_text())

            cursor_home = Path(td) / "cursor-home"
            cursor_home.mkdir()
            run("install", "--host", "cursor", "--scope", "user", home=cursor_home)
            cursor_recall = cursor_home / ".cursor/skills/recall/SKILL.md"
            self.assertNotIn(begin, cursor_recall.read_text())

    def test_pointer_description_and_absolute_staging_path(self):
        with tempfile.TemporaryDirectory() as td:
            home, project = Path(td) / "home", Path(td) / "project"
            home.mkdir()
            project.mkdir()
            result = run("install", "--host", "gemini-cli", "--scope", "project", home=home, project=project)
            self.assertEqual(result.returncode, 0, result.stderr)
            pointer = project / ".gemini/commands/setup-pstack.toml"
            text = pointer.read_text()
            self.assertIn("Configure which models pstack uses", text)
            prompt = next(line for line in text.splitlines() if line.startswith("prompt"))
            self.assertIn(str(home), prompt)
            self.assertIn("SKILL.md", prompt)

    def test_doctor_clean_and_installed(self):
        with tempfile.TemporaryDirectory() as td:
            home, project = Path(td) / "home", Path(td) / "project"
            home.mkdir()
            project.mkdir()
            clean = run("doctor", "--host", "claude-code", "--scope", "user", home=home, project=project)
            self.assertEqual(clean.returncode, 0)
            self.assertIn("installed=False", clean.stdout)
            run("install", "--host", "claude-code", home=home, project=project)
            installed = run("doctor", "--host", "claude-code", "--scope", "user", home=home, project=project)
            self.assertEqual(installed.returncode, 0)
            self.assertIn("installed=True", installed.stdout)
            self.assertIn("missing artifacts: none", installed.stdout)


if __name__ == "__main__":
    unittest.main()
