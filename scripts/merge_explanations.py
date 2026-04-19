"""Merge explanation files (data/exp_<name>.json) into main question files.

Each exp file is a JSON object: {"<id>": "explanation text", ...}
Main files are JSON arrays. Add/update `explanation` field on matching ids.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"


def main() -> None:
    exp_files = sorted(DATA.glob("exp_*.json"))
    if not exp_files:
        print("No exp_*.json files found")
        return

    total_merged = 0
    for exp_path in exp_files:
        main_name = exp_path.name.replace("exp_", "", 1)
        main_path = DATA / main_name
        if not main_path.exists():
            print(f"skip: {main_name} does not exist")
            continue

        exp_map = json.loads(exp_path.read_text(encoding="utf-8"))
        exp_map = {str(k): v for k, v in exp_map.items()}

        questions = json.loads(main_path.read_text(encoding="utf-8"))
        merged = 0
        for q in questions:
            qid = str(q.get("id"))
            if qid in exp_map:
                q["explanation"] = exp_map[qid]
                merged += 1

        main_path.write_text(
            json.dumps(questions, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        total_merged += merged
        print(f"{main_name}: merged {merged}/{len(questions)}")

    print(f"\nTotal explanations merged: {total_merged}")


if __name__ == "__main__":
    main()
