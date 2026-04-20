"""Generate data/version.json with today's version string: YYYY-MM-DD.N
and also poke sw.js / index.html so the Service Worker bumps every build.

Why bump sw.js? iOS and some browsers only register a new Service Worker
when sw.js bytes differ from the cached one. Flipping the version constant
guarantees the SW is seen as a new version and re-activates on every commit,
triggering clients to re-fetch HTML/JS/CSS.

Run this BEFORE git commit (also invoked automatically by .githooks/pre-commit).
"""
import json
import re
import subprocess
import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def count_today_commits() -> int:
    try:
        out = subprocess.check_output(
            ["git", "log", "--oneline", "--since=midnight"],
            cwd=ROOT, encoding="utf-8", errors="replace"
        )
        return len([l for l in out.splitlines() if l.strip()])
    except Exception as e:
        print(f"warn: git log failed: {e}")
        return 0


def bump_sw(version: str) -> None:
    sw = ROOT / "sw.js"
    if not sw.exists():
        return
    text = sw.read_text(encoding="utf-8")
    new_text = re.sub(
        r"const CACHE_VERSION = ['\"][^'\"]*['\"];",
        f"const CACHE_VERSION = '{version}';",
        text,
        count=1,
    )
    if new_text != text:
        sw.write_text(new_text, encoding="utf-8")
        print(f"bumped sw.js CACHE_VERSION -> {version}")


def bump_index_cache_bust(version: str) -> None:
    """Update ?v=... on app.js / style.css in index.html so browsers also
    bypass their HTTP cache for dynamic assets."""
    idx = ROOT / "index.html"
    if not idx.exists():
        return
    text = idx.read_text(encoding="utf-8")
    new_text = re.sub(r"\?v=[0-9][^\"'\s]*", f"?v={version}", text)
    if new_text != text:
        idx.write_text(new_text, encoding="utf-8")
        print(f"bumped index.html ?v= -> {version}")


def main() -> None:
    today = datetime.date.today().isoformat()  # YYYY-MM-DD
    n = count_today_commits() + 1  # +1 for the commit about to happen
    version = f"{today}.{n}"

    target = ROOT / "data" / "version.json"
    target.write_text(
        json.dumps({"version": version, "date": today, "build": n}, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"wrote {target} -> {version}")

    bump_sw(version)
    bump_index_cache_bust(version)


if __name__ == "__main__":
    main()
