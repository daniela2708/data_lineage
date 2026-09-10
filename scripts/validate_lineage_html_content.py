#!/usr/bin/env python3
"""Validate complete semantic ingestion of every lineage HTML report."""

from __future__ import annotations

import argparse
import collections
import hashlib
import html
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from typing import Any


SOURCE_DIRECTORY = Path("diagramas_html")
REPORT_DATASET = Path("src/data/lineageReports.json")
CATALOG_DATASET = Path("src/data/lineage.json")
TEXT_TAGS = ("h1", "h2", "h3", "p", "tr", "li")


def normalize(value: str) -> str:
    return " ".join(html.unescape(value).split())


def canonical(value: str) -> str:
    return re.sub(r"\s+", "", value)


class SemanticParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.stack: list[str] = []
        self.buffers: list[tuple[str, list[str]]] = []
        self.values: dict[str, list[str]] = collections.defaultdict(list)

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.stack.append(tag)
        attributes = dict(attrs)
        if tag in {"line", "path"} and "svg" in self.stack and attributes.get("marker-end"):
            signature = "|".join(
                [
                    tag,
                    attributes.get("x1", ""),
                    attributes.get("y1", ""),
                    attributes.get("x2", ""),
                    attributes.get("y2", ""),
                    attributes.get("d", ""),
                    attributes.get("stroke", ""),
                    attributes.get("stroke-dasharray", ""),
                    attributes.get("marker-end", ""),
                ]
            )
            self.values["svg_relationship"].append(signature)
        if tag in TEXT_TAGS:
            self.buffers.append((tag, []))
        if tag == "text" and "svg" in self.stack:
            self.buffers.append(("svg_text", []))

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

    def handle_data(self, data: str) -> None:
        if self.stack and self.stack[-1] in {"style", "script"}:
            return
        for _, parts in self.buffers:
            parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        expected = "svg_text" if tag == "text" and "svg" in self.stack else tag
        for index in range(len(self.buffers) - 1, -1, -1):
            kind, parts = self.buffers[index]
            if kind == expected:
                value = normalize("".join(parts))
                if value or kind in TEXT_TAGS:
                    self.values[kind].append(value)
                del self.buffers[index]
                break
        if tag in self.stack:
            reverse_index = self.stack[::-1].index(tag)
            del self.stack[len(self.stack) - reverse_index - 1 :]


def parse_semantics(source: str) -> SemanticParser:
    parser = SemanticParser()
    parser.feed(source)
    parser.close()
    return parser


def report_semantics(report: dict[str, Any]) -> SemanticParser:
    diagram = parse_semantics(report["diagramSvg"])
    values: dict[str, list[str]] = collections.defaultdict(list)
    values["h1"].append(report["title"])
    values["p"].append(report["subtitle"])
    values["svg_text"].extend(diagram.values["svg_text"])
    values["svg_relationship"].extend(diagram.values["svg_relationship"])

    for section in report["sections"]:
        values["h2"].append(section["title"])
        for block in section["blocks"]:
            if block["type"] == "heading":
                values["h3"].append(block["text"])
            elif block["type"] == "paragraph":
                values["p"].append(block["text"])
            elif block["type"] == "table":
                values["tr"].extend(normalize(" ".join(cell["text"] for cell in row)) for row in block["rows"])
            elif block["type"] == "list":
                values["li"].extend(normalize(f'{item["text"]} {item.get("note", "")}') for item in block["items"])
            else:
                raise ValueError(f'Unsupported generated block type: {block["type"]}')
    values["p"].append(report["footer"])

    result = SemanticParser()
    result.values = values
    return result


def missing_multiset(baseline: list[str], candidate: list[str]) -> list[str]:
    return list((collections.Counter(baseline) - collections.Counter(candidate)).elements())


def validate_report(path: Path, report: dict[str, Any], dist_directory: Path | None) -> list[str]:
    source_bytes = path.read_bytes()
    source = parse_semantics(source_bytes.decode("utf-8"))
    candidate = report_semantics(report)
    failures: list[str] = []

    for kind in (*TEXT_TAGS, "svg_text", "svg_relationship"):
        source_values = [canonical(value) for value in source.values[kind]]
        candidate_values = [canonical(value) for value in candidate.values[kind]]
        missing = missing_multiset(source_values, candidate_values)
        added = missing_multiset(candidate_values, source_values)
        if missing:
            failures.append(f"{kind}: missing {missing!r}")
        if added:
            failures.append(f"{kind}: unexpected {added!r}")

    digest = hashlib.sha256(source_bytes).hexdigest()
    expected_table = path.name.removesuffix("_lineage.html").upper()
    if report["sourceFile"] != path.name:
        failures.append(f'sourceFile: expected {path.name!r}, got {report["sourceFile"]!r}')
    if report["tableName"] != expected_table:
        failures.append(f'tableName: expected {expected_table!r}, got {report["tableName"]!r}')
    if report["sourceSha256"] != digest:
        failures.append("sourceSha256 does not match the source HTML")
    if report["carrierCount"] != sum(len(source.values[kind]) for kind in (*TEXT_TAGS, "svg_text", "svg_relationship")):
        failures.append("carrierCount does not match the semantic carrier total")

    if dist_directory is not None:
        deployed = dist_directory / path.name
        if not deployed.is_file():
            failures.append(f"deployment artifact is missing: {deployed}")
        elif hashlib.sha256(deployed.read_bytes()).hexdigest() != digest:
            failures.append(f"deployment artifact differs from source: {deployed}")
    return failures


def main() -> int:
    argument_parser = argparse.ArgumentParser()
    argument_parser.add_argument("--dist", action="store_true", help="Also verify exact HTML copies in dist/diagramas_html")
    arguments = argument_parser.parse_args()

    source_paths = sorted(SOURCE_DIRECTORY.glob("*_lineage.html"))
    dataset = json.loads(REPORT_DATASET.read_text(encoding="utf-8"))
    reports = dataset["reports"]
    reports_by_file = {report["sourceFile"]: report for report in reports}
    catalog = json.loads(CATALOG_DATASET.read_text(encoding="utf-8"))
    catalog_names = {table["name"] for table in catalog["tables"]}
    dist_directory = Path("dist/diagramas_html") if arguments.dist else None

    print("Lineage HTML ingestion validation\n")
    passed = True
    if len(source_paths) != len(reports):
        passed = False
        print(f"FAIL: {len(source_paths)} source HTML files but {len(reports)} generated reports\n")

    total_carriers = 0
    for path in source_paths:
        report = reports_by_file.get(path.name)
        failures = ["generated report is missing"] if report is None else validate_report(path, report, dist_directory)
        expected_table = path.name.removesuffix("_lineage.html").upper()
        if expected_table not in catalog_names:
            failures.append(f"catalog table is missing: {expected_table}")
        if report is not None:
            total_carriers += report["carrierCount"]

        if failures:
            passed = False
            print(f"{path.name}: FAIL")
            for failure in failures:
                print(f"- {failure}")
        else:
            print(f'{path.name}: PASS ({report["carrierCount"]} carriers)')

    unknown_reports = sorted(set(reports_by_file) - {path.name for path in source_paths})
    if unknown_reports:
        passed = False
        print(f"\nFAIL: reports without source HTML: {unknown_reports!r}")

    if passed:
        deployment = " and exact deployment copies" if arguments.dist else ""
        print(f"\nPASS: {len(source_paths)} reports, {total_carriers} semantic carriers, zero omissions{deployment}")
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
