"""Merge explanation and translation files into main question files.

Supports two types of side files:
- data/exp_<name>.json -> field `explanation`
- data/tl_<name>.json  -> field `translation`

Each side file is a JSON object {"<id>": "text", ...}
Main files are JSON arrays of question objects.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

SIDE_SPECS = [
    ("exp_", "explanation"),
    ("tl_", "translation"),
]


def merge_side(prefix: str, field: str) -> int:
    total = 0
    side_files = sorted(DATA.glob(f"{prefix}*.json"))
    for side_path in side_files:
        main_name = side_path.name.replace(prefix, "", 1)
        main_path = DATA / main_name
        if not main_path.exists():
            print(f"skip: {main_name} does not exist")
            continue

        side_map = json.loads(side_path.read_text(encoding="utf-8"))
        side_map = {str(k): v for k, v in side_map.items()}

        questions = json.loads(main_path.read_text(encoding="utf-8"))
        merged = 0
        for q in questions:
            qid = str(q.get("id"))
            if qid in side_map:
                q[field] = side_map[qid]
                merged += 1

        main_path.write_text(
            json.dumps(questions, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        total += merged
        print(f"  {main_name}: {merged}/{len(questions)}")
    return total


def main() -> None:
    for prefix, field in SIDE_SPECS:
        print(f"=== {prefix}* -> {field} ===")
        n = merge_side(prefix, field)
        print(f"  total: {n}\n")


if __name__ == "__main__":
    main()
