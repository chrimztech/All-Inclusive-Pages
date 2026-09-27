"""Generates docs/metrics.md from the metric definitions in MetricsService.java, so the two cannot drift.

Usage: python scripts/gen-metrics-doc.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "backend/src/main/java/zm/eoz/platform/reporting/MetricsService.java"
TARGET = ROOT / "docs/metrics.md"

src = SOURCE.read_text(encoding="utf8")
UNITS = {"count", "percent", "hours", "days", "ratio", "rating", "ZMW"}
LIT = re.compile(r'"((?:[^"\\]|\\.)*)"')


def calls(text):
    """Yield the argument text of every m(...) call, with balanced parentheses."""
    for m in re.finditer(r"\bm\(", text):
        depth, i = 1, m.end()
        in_str = False
        while depth:
            c = text[i]
            if in_str:
                if c == "\\":
                    i += 1
                elif c == '"':
                    in_str = False
            elif c == '"':
                in_str = True
            elif c == "(":
                depth += 1
            elif c == ")":
                depth -= 1
            i += 1
        yield text[m.end():i - 1]


families = {m.group(1): m.group(2) for m in re.finditer(r'new Family\("(\w+)", "([^"]+)"', src)}
rows = []
for args in calls(src):
    lits = [lit.replace('\\"', '"') for lit in LIT.findall(args)]
    if len(lits) < 4 or "." not in lits[0]:
        continue
    unit_idx = max(i for i, lit in enumerate(lits) if lit in UNITS)
    if lits[0] == "funnel.reached.":
        # Built in a loop over stages; expand it the same way the code does.
        for code, label in re.findall(r'\{"([A-Z_]+)", "([^"]+)"\}', src):
            rows.append(("funnel.reached." + code.lower(), label, lits[unit_idx],
                         f"Applications submitted in the window that have ever reached {code}"
                         " ÷ applications submitted in the window."))
        continue
    rows.append((lits[0], lits[1], lits[unit_idx], "".join(lits[unit_idx + 1:])))

out = [
    "# Metric definitions", "",
    "Generated from `backend/src/main/java/zm/eoz/platform/reporting/MetricsService.java` by"
    " `python scripts/gen-metrics-doc.py`; rerun it when a definition changes. The same text is shown next to each"
    " figure under **Admin → Reports**.", "",
    "**Reporting window:** whole days in Africa/Lusaka time, from 00:00 on the start date up to (not including)"
    " 00:00 after the end date. The default is the last 30 days, and the maximum is one year."
    " Metrics marked *(snapshot)* describe the current state and ignore the window.", "",
    "**Privacy:** no metric breaks candidates down by personal characteristics (sex, age, disability and so on), so"
    " no small groups of candidates can be singled out.", "",
]
for fam in ["reach", "publication", "funnel", "employers", "services", "quality"]:
    out += [f"## {families.get(fam, fam)}", "", "| Metric | Unit | Definition |", "|---|---|---|"]
    for key, label, unit, definition in rows:
        if key.split(".")[0] == fam:
            snap = " *(snapshot)*" if "snapshot" in definition or fam == "quality" else ""
            out.append(f"| {label}{snap} | {unit} | {definition.replace('|', '/')} |")
    out.append("")
TARGET.write_text("\n".join(out), encoding="utf8", newline="\n")
print(len(rows), "metrics documented in", TARGET.relative_to(ROOT))
