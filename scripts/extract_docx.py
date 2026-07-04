"""Extract ordered, formatting-aware content from the grammar DOCX volumes."""

from __future__ import annotations

import argparse
import html
import json
import re
import zipfile
from pathlib import Path

from lxml import etree

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
NS = {"w": W_NS}
W = f"{{{W_NS}}}"


def run_text(run: etree._Element) -> tuple[str, str]:
    pieces: list[str] = []
    for node in run.iter():
        if node.tag == f"{W}t":
            pieces.append(node.text or "")
        elif node.tag == f"{W}tab":
            pieces.append("\t")
        elif node.tag == f"{W}br":
            pieces.append("\n")
    plain = "".join(pieces)
    if not plain:
        return "", ""
    rendered = html.escape(plain).replace("\n", "<br>")
    props = run.find("w:rPr", NS)
    if props is not None:
        if props.find("w:u", NS) is not None:
            rendered = f"<u>{rendered}</u>"
        if props.find("w:i", NS) is not None:
            rendered = f"<em>{rendered}</em>"
        if props.find("w:b", NS) is not None:
            rendered = f"<strong>{rendered}</strong>"
        colour = props.find("w:color", NS)
        if colour is not None and (colour.get(f"{W}val") or "").upper() == "FF0000":
            rendered = f'<span class="hl-red">{rendered}</span>'
    return plain, rendered


def paragraph_data(paragraph: etree._Element) -> dict[str, object]:
    plain_parts: list[str] = []
    html_parts: list[str] = []
    for child in paragraph:
        if child.tag == f"{W}r":
            plain, rendered = run_text(child)
            plain_parts.append(plain)
            html_parts.append(rendered)
        elif child.tag == f"{W}hyperlink":
            for run in child.findall(".//w:r", NS):
                plain, rendered = run_text(run)
                plain_parts.append(plain)
                html_parts.append(rendered)
    props = paragraph.find("w:pPr", NS)
    is_list = bool(props is not None and props.find("w:numPr", NS) is not None)
    return {"type": "p", "plain": "".join(plain_parts), "html": "".join(html_parts), "is_list": is_list}


def table_data(table: etree._Element) -> dict[str, object]:
    rows: list[list[dict[str, str]]] = []
    for row in table.findall("w:tr", NS):
        cells: list[dict[str, str]] = []
        for cell in row.findall("w:tc", NS):
            paragraphs = [paragraph_data(paragraph) for paragraph in cell.findall("w:p", NS)]
            cells.append({
                "plain": "\n".join(str(p["plain"]) for p in paragraphs),
                "html": "<br>".join(str(p["html"]) for p in paragraphs),
            })
        rows.append(cells)
    return {"type": "table", "rows": rows}


def extract_document(source: Path) -> list[dict[str, object]]:
    with zipfile.ZipFile(source) as archive:
        xml = archive.read("word/document.xml")
    root = etree.fromstring(xml)
    body = root.find("w:body", NS)
    if body is None:
        raise ValueError(f"No document body found in {source}")
    items: list[dict[str, object]] = []
    for child in body:
        if child.tag == f"{W}p":
            items.append(paragraph_data(child))
        elif child.tag == f"{W}tbl":
            items.append(table_data(child))
    return items


def chapter_headers(items: list[dict[str, object]]) -> list[dict[str, object]]:
    headers: list[dict[str, object]] = []
    for index, item in enumerate(items):
        if item["type"] != "table":
            continue
        rows = item.get("rows", [])
        if len(rows) != 1 or len(rows[0]) != 2:
            continue
        first = re.sub(r"\s+", "", str(rows[0][0]["plain"]))
        match = re.fullmatch(r"0*(\d{1,3})", first)
        title = str(rows[0][1]["plain"]).strip()
        if match and title:
            headers.append({"number": int(match.group(1)), "title": title, "start_index": index})
    for current, following in zip(headers, headers[1:]):
        current["end_index"] = following["start_index"]
    if headers:
        headers[-1]["end_index"] = len(items)
    return headers


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--headers", type=Path)
    args = parser.parse_args()
    extracted = extract_document(args.source)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(extracted, ensure_ascii=False, indent=2), encoding="utf-8")
    headers = chapter_headers(extracted)
    if args.headers:
        args.headers.parent.mkdir(parents=True, exist_ok=True)
        args.headers.write_text(json.dumps(headers, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"source": str(args.source), "elements": len(extracted), "chapters": len(headers), "headers": headers}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
