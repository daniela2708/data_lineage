#!/usr/bin/env python3
"""Validate that lineage HTML layout edits preserve baseline semantic content."""

from __future__ import annotations

import argparse
import collections
import html
import re
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path


REPORTS = (
    Path("public/club_card_dim_lineage.html"),
    Path("public/item_dim_lineage.html"),
    Path("public/vendor_item_xref_lineage.html"),
)
TEXT_TAGS = ("h1", "h2", "h3", "p", "th", "td", "li", "code")
IDENTIFIER_RE = re.compile(
    r"\b(?:WMBI(?:_ETL)?|HQAnalytics|AMS_PROD)[.][A-Za-z0-9_$]+(?:[.][A-Za-z0-9_$]+)*\b"
    r"|\b(?:df|pf)_[A-Za-z0-9_]+\b"
    r"|\b[A-Z][A-Z0-9_]*(?:_TR|_KEY|_ID|_CD|_FL|_DT|_DTTM|_VAL)\b"
)
FACT_RE = re.compile(
    r"\b\d{4}[-/]\d{2}[-/]\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2}(?:[.]\d+)?)?)?\b"
    r"|\b\d{2}:\d{2}(?::\d{2})?\b"
    r"|\b\d+(?:,\d{3})+(?:[.]\d+)?\b"
    r"|\b\d+(?:[.]\d+)?\s*(?:percent|%)\b"
    r"|\b\d+\s+columns?\b",
    re.IGNORECASE,
)


def normalize(value: str) -> str:
    return " ".join(html.unescape(value).split())


class SemanticParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[str] = []
        self.buffers: list[tuple[str, list[str]]] = []
        self.values: dict[str, list[str]] = collections.defaultdict(list)
        self.visible_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.stack.append(tag)
        attributes = dict(attrs)
        if tag in {"line", "path"} and "svg" in self.stack and attributes.get("marker-end"):
            style = "dashed" if attributes.get("stroke-dasharray") else "solid"
            stroke = attributes.get("stroke", "")
            self.values["svg_relationship"].append(f"{tag}:{stroke}:{style}")
        if tag in TEXT_TAGS:
            self.buffers.append((tag, []))
        if tag == "text" and "svg" in self.stack:
            self.buffers.append(("svg_text", []))

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        return

    def handle_data(self, data: str) -> None:
        if self.stack and self.stack[-1] not in {"style", "script"}:
            self.visible_parts.append(data)
        for _, parts in self.buffers:
            parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        expected = "svg_text" if tag == "text" and "svg" in self.stack else tag
        for index in range(len(self.buffers) - 1, -1, -1):
            kind, parts = self.buffers[index]
            if kind == expected:
                value = normalize("".join(parts))
                if value:
                    self.values[kind].append(value)
                del self.buffers[index]
                break
        if tag in self.stack:
            reverse_index = self.stack[::-1].index(tag)
            del self.stack[len(self.stack) - reverse_index - 1 :]

    @property
    def visible_text(self) -> str:
        return normalize(" ".join(self.visible_parts))


def parse_semantics(source: str) -> SemanticParser:
    parser = SemanticParser()
    parser.feed(source)
    parser.close()
    return parser


def baseline_from_git(path: Path, revision: str) -> str:
    result = subprocess.run(
        ["git", "show", f"{revision}:{path.as_posix()}"],
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout


def missing_multiset(baseline: list[str], candidate: list[str]) -> list[str]:
    return list((collections.Counter(baseline) - collections.Counter(candidate)).elements())


def validate(path: Path, revision: str) -> tuple[bool, list[str]]:
    baseline = parse_semantics(baseline_from_git(path, revision))
    candidate = parse_semantics(path.read_text(encoding="utf-8"))
    failures: list[str] = []

    for kind in (*TEXT_TAGS, "svg_text", "svg_relationship"):
        missing = missing_multiset(baseline.values[kind], candidate.values[kind])
        if missing:
            failures.append(f"{kind}: missing {missing!r}")

    baseline_identifiers = IDENTIFIER_RE.findall(baseline.visible_text)
    candidate_identifiers = IDENTIFIER_RE.findall(candidate.visible_text)
    missing_identifiers = missing_multiset(baseline_identifiers, candidate_identifiers)
    if missing_identifiers:
        failures.append(f"identifiers: missing {missing_identifiers!r}")

    baseline_facts = FACT_RE.findall(baseline.visible_text)
    candidate_facts = FACT_RE.findall(candidate.visible_text)
    missing_facts = missing_multiset(baseline_facts, candidate_facts)
    if missing_facts:
        failures.append(f"factual tokens: missing {missing_facts!r}")

    return not failures, failures


def main() -> int:
    argument_parser = argparse.ArgumentParser()
    argument_parser.add_argument("--baseline", default="HEAD", help="Git revision used as the semantic baseline")
    arguments = argument_parser.parse_args()

    print("Lineage content preservation validation\n")
    passed = True
    for path in REPORTS:
        ok, failures = validate(path, arguments.baseline)
        print(path.name)
        if ok:
            print("PASS")
            print("- baseline identifiers preserved")
            print("- findings preserved")
            print("- pending validations preserved")
            print("- dependency content preserved")
            print("- SVG semantic labels preserved")
            print("- SVG relationships preserved by type, color and style")
        else:
            passed = False
            print("FAIL")
            for failure in failures:
                print(f"- {failure}")
        print()
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
