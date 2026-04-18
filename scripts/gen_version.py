"""Generate data/version.json with today's version string: YYYY-MM-DD.N
where N is count of commits made today (including the one about to be made).
Run this BEFORE git commit to freshen the version.
"""
import json
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


def main() -> None:
    today = datetime.date.today().isoformat()  # YYYY-MM-DD
    n = count_today_commits() + 1  # +1 for the commit about to happen
    version = f"{today}.{n}"
    target = ROOT / "data" / "version.json"
    target.write_text(
        json.dumps({"version": version, "date": today, "build": n}, ensure_ascii=False),
        encoding="utf-8"
    )
    print(f"wrote {target} -> {version}")


if __name__ == "__main__":
    main()
