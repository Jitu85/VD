"""Turn formatting-aware raw extraction into chapter and exercise data."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

INSTRUCTION_VERBS = (
    "Rewrite", "Join", "Combine", "Fill in", "Complete", "Correct", "Identify",
    "Punctuate", "Convert", "Change", "Form", "Choose", "Select", "Match", "Pick",
    "Underline", "Insert", "Add", "Answer", "Put into", "Put the", "From sentences"
)
# The final four forms occur as unambiguous meta-instructions in this volume.
ARTIFACT_PATTERNS = (
    re.compile(r"kindle", re.I),
    re.compile(r"space provided", re.I),
    re.compile(r"end of part", re.I),
    re.compile(r"check out part", re.I),
)
EXERCISE_RE = re.compile(r"^EXERCISE\s*:?\s*(\d+)\b", re.I)
ANSWER_HEADER_RE = re.compile(r"^Exercise\s*:?\s*(\d+)\b", re.I)
BLANK_LINE_RE = re.compile(r"^[_\s]{4,}$")
NUMBERED_SPLIT_RE = re.compile(r"(?:^|\s)(?:\d+)\.\s*")


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def is_artifact(text: str) -> bool:
    stripped = text.strip()
    return (
        not stripped
        or bool(BLANK_LINE_RE.fullmatch(stripped))
        or any(pattern.search(stripped) for pattern in ARTIFACT_PATTERNS)
    )


def is_instruction(text: str) -> bool:
    stripped = clean_text(text)
    if not stripped or len(stripped) >= 180 or stripped.startswith("="):
        return False
    lowered = stripped.casefold()
    if any(
        lowered.startswith(verb.casefold() + " ")
        or lowered.startswith(verb.casefold() + ":")
        for verb in INSTRUCTION_VERBS
    ):
        return True
    # Narrow, source-confirmed forms whose leading verbs are unsafe as a broad
    # whitelist because genuine questions can also begin with those verbs.
    return bool(re.match(
        r"^(?:write\s+-?questions|write questions|ask questions|answer the following|put (?:the following|into)|study the following)",
        stripped,
        re.I,
    ))


def chapter_headers(items: list[dict]) -> list[dict]:
    headers = []
    for index, item in enumerate(items):
        if item["type"] != "table":
            continue
        rows = item.get("rows", [])
        if len(rows) != 1 or len(rows[0]) != 2:
            continue
        number_text = re.sub(r"\s+", "", rows[0][0]["plain"])
        match = re.fullmatch(r"0*(\d{1,3})", number_text)
        title = clean_text(rows[0][1]["plain"])
        if match and title:
            headers.append({"number": int(match.group(1)), "title": title, "start": index})
    for current, following in zip(headers, headers[1:]):
        current["end"] = following["start"]
    if headers:
        headers[-1]["end"] = len(items)
    return headers


def body_item(item: dict) -> dict | None:
    if item["type"] == "p":
        if is_artifact(item["plain"]):
            return None
        return {"type": "paragraph", "html": item["html"], "plain": item["plain"], "isList": item["is_list"]}
    rows = []
    for row in item.get("rows", []):
        rows.append([{"plain": cell["plain"], "html": cell["html"]} for cell in row])
    return {"type": "table", "rows": rows}


def parse_question_groups(block: list[dict], default_instruction: str) -> list[dict]:
    groups: list[dict] = []
    instruction_lines: list[str] = []
    current: dict | None = None
    index = 0

    def following_list(position: int, limit: int = 3) -> dict | None:
        checked = 0
        for candidate in block[position + 1:]:
            if candidate["type"] != "p" or not candidate["plain"].strip():
                continue
            checked += 1
            if candidate["is_list"]:
                return candidate
            if checked >= limit:
                return None
        return None

    while index < len(block):
        item = block[index]
        index += 1
        if item["type"] != "p":
            continue
        plain = item["plain"].strip()
        if not plain or is_artifact(plain):
            continue

        if item["is_list"]:
            if is_instruction(plain):
                if current and current["items"]:
                    groups.append(current)
                current = {"instruction": clean_text(plain), "items": []}
                continue
            if current is None:
                current = {
                    "instruction": clean_text(" ".join(instruction_lines)) or default_instruction,
                    "items": [],
                }
            current["items"].append({"prompt": plain, "promptHtml": item["html"], "answer": None, "answerSource": "missing"})
            continue

        if current is None or not current["items"]:
            instruction_lines.append(plain)
            continue

        next_item = following_list(index - 1)
        if next_item is not None and next_item["is_list"]:
            instruction = current["instruction"].casefold()
            question = current["items"][-1]
            if instruction.startswith(("combine", "join")):
                # The second sentence of a pair is frequently a plain paragraph.
                question["prompt"] = clean_text(question["prompt"] + " " + plain)
                question["promptHtml"] += "<br>" + item["html"]
                continue
            prompt = question["prompt"]
            if (
                re.match(r"^\(?\s*(?:=|q\.)", plain, re.I)
                or (instruction.startswith(("ask questions", "write questions", "write -questions")) and plain.endswith("?"))
                or (("(" in prompt or "_" in prompt) and "_" not in plain and "(" not in plain)
            ):
                # A worked answer is inserted between the model question and the
                # remaining list. It is useful in the lesson, not a quiz item.
                continue

        # A plain-text section otherwise marks the return to teaching content.
        groups.append(current)
        current = None
        break

    if current and current["items"]:
        groups.append(current)
    return groups


def split_answer_paragraph(text: str) -> list[str]:
    stripped = clean_text(text)
    if not stripped:
        return []
    # Packed columns frequently collapse to ?I. 1. answer 2. answer? or even
    # ?13 who 14 which?. Detect numbered starts rather than splitting prose.
    marker_re = re.compile(r"(?<![A-Za-z0-9])\d{1,2}\s*[.,]?\s+")
    markers = list(marker_re.finditer(stripped))
    if markers and markers[0].start() <= 8:
        pieces = []
        for position, marker in enumerate(markers):
            end = markers[position + 1].start() if position + 1 < len(markers) else len(stripped)
            piece = stripped[marker.end():end].strip(" ,;\t")
            if piece:
                pieces.append(piece)
        return pieces
    return [stripped]


def answer_sections(items: list[dict]) -> dict[int, list[str]]:
    sections: dict[int, list[str]] = {}
    current_number: int | None = None
    for item in items:
        if item["type"] != "p":
            continue
        plain = item["plain"].strip()
        header = ANSWER_HEADER_RE.match(plain)
        if header:
            current_number = int(header.group(1))
            sections.setdefault(current_number, [])
            continue
        if (
            current_number is None
            or not plain
            or is_instruction(plain)
            or re.fullmatch(r"[IVX]+\.?", plain, re.I)
        ):
            continue
        sections[current_number].extend(split_answer_paragraph(plain))
    return sections


def parse_chapter(items: list[dict], header: dict) -> dict:
    content = items[header["start"] + 1:header["end"]]
    answer_at = next((i for i, item in enumerate(content) if item["type"] == "p" and item["plain"].strip().casefold() == "answers"), None)
    before_answers = content if answer_at is None else content[:answer_at]
    after_answers = [] if answer_at is None else content[answer_at + 1:]

    exercise_markers = []
    for index, item in enumerate(before_answers):
        if item["type"] != "p":
            continue
        match = EXERCISE_RE.match(item["plain"].strip())
        if match:
            exercise_markers.append((index, int(match.group(1))))

    body_end = exercise_markers[0][0] if exercise_markers else len(before_answers)
    body = [candidate for item in before_answers[:body_end] if (candidate := body_item(item))]
    exercises = []

    if exercise_markers:
        for marker_index, (start, number) in enumerate(exercise_markers):
            end = exercise_markers[marker_index + 1][0] if marker_index + 1 < len(exercise_markers) else len(before_answers)
            groups = parse_question_groups(before_answers[start + 1:end], "Complete the following exercise:")
            exercises.append({"number": number, "groups": groups})
    else:
        # Fallback: parse all pre-answer list runs. For the final test, instructions
        # within the run naturally create multiple groups.
        groups = parse_question_groups(before_answers, "Complete the following exercise:")
        if groups:
            exercises.append({"number": header["number"], "groups": groups, "fallback": True})
            first_question_index = next((i for i, item in enumerate(before_answers) if item["type"] == "p" and item["is_list"]), len(before_answers))
            body = [candidate for item in before_answers[:first_question_index] if (candidate := body_item(item))]

    answers = answer_sections(after_answers)
    for exercise in exercises:
        answer_list = answers.get(exercise["number"], [])
        questions = [question for group in exercise["groups"] for question in group["items"]]
        for question, answer in zip(questions, answer_list):
            question["answer"] = answer
            question["answerSource"] = "book"
        exercise["itemCount"] = len(questions)
        exercise["answerCount"] = len(answer_list)
        exercise["pairedAnswerCount"] = min(len(questions), len(answer_list))
        exercise["unpairedAnswerCount"] = max(0, len(answer_list) - len(questions))

    return {
        "number": header["number"],
        "title": header["title"],
        "body": body,
        "exercises": exercises,
        "hasOriginalAnswerSection": answer_at is not None,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("report", type=Path)
    parser.add_argument("--volume", type=int, default=1)
    args = parser.parse_args()
    items = json.loads(args.source.read_text(encoding="utf-8"))
    chapters = [parse_chapter(items, header) for header in chapter_headers(items)]
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps({"volume": args.volume, "chapters": chapters}, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = [f"# Volume {args.volume} Extraction Audit", "", "| Chapter | Exercise | Items | Answers recovered | Paired | Extra answers |", "|---:|---:|---:|---:|---:|---:|"]
    for chapter in chapters:
        for exercise in chapter["exercises"]:
            lines.append(f"| {chapter['number']:02d} | {exercise['number']:02d} | {exercise['itemCount']} | {exercise['answerCount']} | {exercise['pairedAnswerCount']} | {exercise['unpairedAnswerCount']} |")
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))


if __name__ == "__main__":
    main()




