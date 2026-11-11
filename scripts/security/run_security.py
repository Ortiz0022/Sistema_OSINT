"""Ejecuta los tres escáneres; cualquier hallazgo o análisis incompleto bloquea."""
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "reportes" / "seguridad"
OUT.mkdir(parents=True, exist_ok=True)


def execute(argv, log):
    try:
        with log.open("w", encoding="utf-8") as stream:
            return subprocess.run(argv, cwd=ROOT, stdout=stream, stderr=subprocess.STDOUT,
                                  timeout=600, check=False).returncode
    except (OSError, subprocess.TimeoutExpired) as exc:
        with log.open("a", encoding="utf-8") as stream:
            stream.write(f"\nERROR: {exc}\n")
        return 127


commands = {
    "semgrep": ["semgrep", "scan", "--oss-only", "--metrics=off", "--disable-version-check",
                "--strict", "--error", "--config", ".semgrep/rules.yml", "--json",
                "--output", str(OUT / "semgrep.json"), "src", "server", "scripts"],
    "gitleaks": ["gitleaks", "git", ".", "--config", ".gitleaks.toml", "--redact=100",
                 "--exit-code", "10", "--report-format", "json", "--report-path",
                 str(OUT / "gitleaks.json"), "--log-opts=--all"],
    "osv": ["osv-scanner", "scan", "source", "--lockfile=package-lock.json", "--format=json", "--all-packages",
            "--output-file=" + str(OUT / "osv.json")],
}

results = {}
for tool, command in commands.items():
    version_args = {"semgrep": ["semgrep", "--version"],
                    "gitleaks": ["gitleaks", "version"],
                    "osv": ["osv-scanner", "--version"]}[tool]
    execute(version_args, OUT / f"{tool}-version.txt")
    report = OUT / f"{tool}.json"
    report.unlink(missing_ok=True)
    code = execute(command, OUT / f"{tool}.log")
    valid = False
    try:
        payload = json.loads(report.read_text(encoding="utf-8"))
        valid = isinstance(payload, list) if tool == "gitleaks" else isinstance(payload, dict)
        if tool == "semgrep" and isinstance(payload, dict):
            valid = valid and not payload.get("errors") and bool(payload.get("paths", {}).get("scanned"))
        if tool == "osv" and isinstance(payload, dict):
            valid = valid and bool(payload.get("results"))
    except (OSError, ValueError):
        pass
    finding_code = 10 if tool == "gitleaks" else 1
    status = "sin_hallazgos" if code == 0 and valid else (
        "hallazgos" if code == finding_code and valid else "incompleto_o_error")
    results[tool] = {"exit_code": code, "status": status, "json_validated": valid}
    print(f"{tool}: {status}; exit={code}")

try:
    commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
except (OSError, subprocess.CalledProcessError):
    commit = "no disponible"

manifest = {"utc": datetime.now(timezone.utc).isoformat(), "commit_analizado": commit,
            "github_sha": os.getenv("GITHUB_SHA"), "run_url": (
                f"https://github.com/{os.getenv('GITHUB_REPOSITORY')}/actions/runs/{os.getenv('GITHUB_RUN_ID')}"
                if os.getenv("GITHUB_RUN_ID") else None), "tools": results,
            "passed": all(v["status"] == "sin_hallazgos" for v in results.values())}
(OUT / "resultado.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
sys.exit(0 if manifest["passed"] else 1)
