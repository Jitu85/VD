"""Resolve Volume I's confirmed layout irregularities and supply missing answers."""
from __future__ import annotations

import json
import re
import sys
from copy import deepcopy
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from structure_volume import answer_sections, chapter_headers

ROOT = Path(__file__).resolve().parents[1]
RAW_PATH = ROOT / "data/raw/volume-1.json"
BASE_PATH = ROOT / "data/volume-1.json"
OUT_PATH = ROOT / "src/data/volume-1.json"
REPORT_PATH = ROOT / "data/reports/volume-1-final-audit.md"


def question(prompt: str, answer: str | None = None, *, source: str = "generated", prompt_html: str | None = None, input_type: str = "text", blanks: list[str] | None = None) -> dict:
    result = {
        "prompt": prompt,
        "promptHtml": prompt_html or prompt,
        "answer": answer,
        "answerSource": source if answer else "missing",
        "inputType": input_type,
    }
    if blanks:
        result["blanks"] = blanks
    return result


def get_chapter(data: dict, number: int) -> dict:
    return next(chapter for chapter in data["chapters"] if chapter["number"] == number)


def get_exercise(data: dict, chapter: int, exercise: int) -> dict:
    return next(item for item in get_chapter(data, chapter)["exercises"] if item["number"] == exercise)


def flatten(exercise: dict) -> list[dict]:
    return [item for group in exercise["groups"] for item in group["items"]]


def reset_answers(exercise: dict, answers: list[str], generated_at: dict[int, str] | None = None) -> None:
    generated_at = generated_at or {}
    items = flatten(exercise)
    for index, item in enumerate(items):
        item["inputType"] = item.get("inputType", "text")
        if index in generated_at:
            item["answer"] = generated_at[index]
            item["answerSource"] = "generated"
        elif index < len(answers):
            item["answer"] = answers[index]
            item["answerSource"] = "book"
        else:
            item["answer"] = None
            item["answerSource"] = "missing"
    exercise["itemCount"] = len(items)
    exercise["answerCount"] = sum(1 for item in items if item.get("answer"))
    exercise["generatedAnswerCount"] = sum(1 for item in items if item.get("answerSource") == "generated")
    exercise["missingAnswerCount"] = sum(1 for item in items if not item.get("answer"))


def split_merged_pairs(items: list[dict]) -> list[dict]:
    output = []
    for item in items:
        prompt = item["prompt"]
        match = re.match(r"^\s*1\.\s*(.+?)\s+2\.\s*(.+)$", prompt)
        if match:
            output.append(question(match.group(1).strip(), prompt_html=match.group(1).strip()))
            output.append(question(match.group(2).strip(), prompt_html=match.group(2).strip()))
        else:
            cleaned = re.sub(r"^\s*\d+\.\s*", "", prompt).strip()
            copy = deepcopy(item)
            copy["prompt"] = cleaned
            copy["promptHtml"] = re.sub(r"^\s*\d+\.\s*", "", copy.get("promptHtml", cleaned)).strip()
            output.append(copy)
    return output


def raw_chapter(raw: list[dict], number: int) -> list[dict]:
    header = chapter_headers(raw)[number - 1]
    return raw[header["start"] + 1:header["end"]]


def raw_answers(raw: list[dict], chapter_number: int) -> dict[int, list[str]]:
    content = raw_chapter(raw, chapter_number)
    answer_index = next((index for index, item in enumerate(content) if item["type"] == "p" and item["plain"].strip().casefold() == "answers"), None)
    return {} if answer_index is None else answer_sections(content[answer_index + 1:])


def build_prepositions(exercise: dict) -> None:
    words = [
        "about", "behind", "from", "on", "to", "after", "between", "in", "over", "under",
        "among", "by", "into", "since", "up", "at", "down", "of", "through", "with",
        "before", "for", "off", "till", "without",
    ]
    answers = [
        "We talked about the new project.", "The child hid behind the curtain.",
        "He travelled from Delhi to Mumbai.", "The book is on the table.", "She is going to school.",
        "The cat ran after the mouse.", "The library is between the bank and the school.",
        "The keys are in the drawer.", "A bird flew over the house.", "The cat is under the table.",
        "The teacher divided the sweets among the children.", "The novel was written by Charles Dickens.",
        "The boy jumped into the pool.", "She has lived here since 2020.", "They climbed up the hill.",
        "Meet me at the station.", "She walked down the stairs.", "This is a photograph of my family.",
        "We walked through the forest.", "He cut the paper with scissors.", "Please arrive before noon.",
        "This gift is for you.", "Please switch off the light.", "Wait here till evening.",
        "We cannot live without water.",
    ]
    first = {
        "instruction": "Write one clear sentence using each preposition:",
        "items": [question(f"Use “{word}” in a sentence.", answer) for word, answer in zip(words, answers)],
    }
    exercise["groups"].insert(0, first)


def build_phrasal_verbs(raw: list[dict], exercise: dict) -> None:
    content = raw_chapter(raw, 11)
    start = next(i for i, item in enumerate(content) if item["type"] == "p" and re.match(r"^EXERCISE\s*26", item["plain"].strip(), re.I))
    end = next(i for i, item in enumerate(content[start + 1:], start + 1) if item["type"] == "p" and item["plain"].strip().casefold() == "answers")
    banks = [
        "down, with, out, up, away, on, to", "about, open, down, up, in, into, out, with",
        "up, upon, on, off, in, down, out", "off, on, out, over, down, open, through",
        "in, from, off, up, out, at, on", "at, in, out, through, for, down, forward, into, to",
    ]
    groups = []
    current = None
    corrections = {
        "He backed of ____________ his promise.": "He backed ____________ of his promise.",
        "The nurse was attending ______________ the patient attend.": "The nurse was attending ______________ the patient.",
        "Attend ______________ the teacher is saying.": "Attend ______________ to what the teacher is saying.",
        "HIs marriage comes ______________ next Monday.": "His marriage comes ______________ next Monday.",
        "Hold _____________ your temper place.": "Hold _____________ your temper, please.",
        "He led the air _________________ of the tyres.": "He let the air _________________ of the tyres.",
        "I can’t make __________________ what you to say.": "I can’t make __________________ what you say.",
    }
    for item in content[start + 1:end]:
        if item["type"] != "p":
            continue
        text = item["plain"].strip()
        match = re.search(r"(?<!\d)(\d{1,2})\.\s*", text)
        if not match:
            if current is not None and item.get("is_list") and len(current["items"]) < 10:
                prompt = corrections.get(text, text)
                current["items"].append(question(prompt, prompt_html=prompt))
            continue
        number = int(match.group(1))
        prompt = text[match.end():].strip()
        if not prompt:
            continue
        if number == 1:
            current = {"instruction": f"Fill each blank with a suitable particle. Choose from: {banks[len(groups)]}", "items": []}
            groups.append(current)
        if current is None:
            continue
        prompt = corrections.get(prompt, prompt)
        current["items"].append(question(prompt, prompt_html=prompt))
    exercise["groups"] = groups


def build_grammar_test(exercise: dict) -> None:
    groups = [
        ("Rewrite the following sentences using ‘else’.", [
            ("You could ask some other person.", "You could ask someone else."),
            ("I did not see any other person there.", "I did not see anyone else there."),
            ("There was no other person to help me.", "There was nobody else to help me."),
            ("Every other person agreed with me.", "Everybody else agreed with me."),
            ("I could not go to any other place.", "I could not go anywhere else."),
        ]),
        ("Write questions to which the marked words are the answers.", [
            ("Cows eat <strong><em>grass</em></strong>.", "What do cows eat?"),
            ("<strong><em>Father</em></strong> has taken the newspaper.", "Who has taken the newspaper?"),
            ("They are coming back <strong><em>on Friday</em></strong>.", "When are they coming back?"),
            ("He has eaten <strong><em>two</em></strong> apples.", "How many apples has he eaten?"),
            ("Shoes are made of <strong><em>leather</em></strong>.", "What are shoes made of?"),
        ]),
        ("Rewrite the following sentences using the words in brackets.", [
            ("Mangoes are also very tasty. (too)", "Mangoes are very tasty too."),
            ("I was also in town on Monday. (as well)", "I was in town on Monday as well."),
            ("He also gave me one. (too)", "He gave me one too."),
            ("We have also been there. (as well)", "We have been there as well."),
            ("I have read the book and I have also seen the film. (too)", "I have read the book and I have seen the film too."),
        ]),
        ("Put the following into reported speech.", [
            ("Misha said to me, “How can I improve my English?”", "Misha asked me how she could improve her English."),
            ("The teacher said to us, “Look up these words in the dictionary.”", "The teacher told us to look up those words in the dictionary."),
            ("“I killed the snake with a stone,” said Anita.", "Anita said that she had killed the snake with a stone."),
            ("Hari said to Manoj, “I shall not be here tomorrow.”", "Hari told Manoj that he would not be there the next day."),
            ("She said to me, “Can you lend me some money?”", "She asked me whether I could lend her some money."),
        ]),
    ]
    result = []
    for instruction, pairs in groups:
        result.append({"instruction": instruction, "items": [question(prompt, answer, prompt_html=prompt) for prompt, answer in pairs]})

    result.append({"instruction": "Correct the errors in the following passage.", "items": [question(
        "A milkmaid was carry a pot of milk upon her head. She said she would sale the milk and get a lots of money by sell it. She planned to buy much more cows.",
        "A milkmaid was carrying a pot of milk on her head. She said she would sell the milk and get a lot of money by selling it. She planned to buy many more cows.", input_type="textarea") ]})
    result.append({"instruction": "Complete the passage by writing one suitable word in each space.", "items": [question(
        "Grandfather’s eyesight is poor. One night ___ fell into ___ old well. Luckily the well ___ not very deep. But the fall gave ___ a fright. We pulled him out; he was holding something tightly ___ his hand. ___ shone brightly in the light. Gold! ‘___ is more of it down there,’ said Grandfather. We went down the well ___ looked. He was right! There ___ a big pot of gold!",
        "he; an; was; him; in; It; There; and; was", input_type="cloze", blanks=["he", "an", "was", "him", "in", "It", "There", "and", "was"]) ]})
    result.append({"instruction": "Join each pair using the word in brackets.", "items": [
        question("I must invite my friends. If I don’t, they will be angry. (or else)", "I must invite my friends, or else they will be angry."),
        question("Work very hard. If you don’t, you will fail again. (otherwise)", "Work very hard; otherwise, you will fail again."),
        question("We must start early. If we don’t, we will miss the train. (or else)", "We must start early, or else we will miss the train."),
        question("Be punctual. If you are not, you will lose your job. (otherwise)", "Be punctual; otherwise, you will lose your job."),
        question("They must practise daily. If they don’t, they may lose the match. (or else)", "They must practise daily, or else they may lose the match."),
    ]})
    result.append({"instruction": "Fill in the blanks with ‘who’, ‘whose’, ‘whom’, ‘that’ or ‘which’.", "items": [
        question("I met Mohan ___ had just returned.", "who"), question("This is the boy ___ all praise.", "whom"),
        question("Take anything ___ you like.", "that"), question("I have found the pen ___ I had lost.", "that/which"),
        question("These are the girls ___ exercises were well done.", "whose"),
    ]})
    result.append({"instruction": "Fill in the blanks with ‘fairly’ or ‘rather’.", "items": [
        question("Tom is ___ clever, but Manu is ___ stupid.", "fairly; rather"),
        question("I walk ___ fast, but Anu walks ___ slowly.", "fairly; rather"),
        question("The weather was ___ worse than I had expected.", "rather"), question("I know him ___ well.", "fairly"),
        question("It is ___ a shame that we have to work on Sundays.", "rather"),
    ]})
    result.append({"instruction": "Put the following into the passive voice.", "items": [
        question("Our grocer sells a special kind of tea.", "A special kind of tea is sold by our grocer."),
        question("Did Rani eat all the biscuits?", "Were all the biscuits eaten by Rani?"),
        question("They have invited me to dinner this evening.", "I have been invited to dinner this evening."),
        question("My uncle sent me a gift.", "I was sent a gift by my uncle."),
        question("The boys were beating the donkey.", "The donkey was being beaten by the boys."),
    ]})
    result.append({"instruction": "Correct the errors in the following passage.", "items": [question(
        "Ramu was a blind old man. One darkeness night he came out from his hut and walking along the road. A youth man shout at him for carrying a lamp in yours hand.",
        "Ramu was a blind old man. One dark night he came out of his hut and walked along the road. A young man shouted at him for carrying a lamp in his hand. Ramu explained that the lamp was for other people, so that they would not knock against him.", input_type="textarea") ]})
    result.append({"instruction": "Supply the omitted words and rewrite the passage correctly.", "items": [question(
        "Shahjahan had only wife. Most kings in those days many wives. Mumtaz loved husband dearly. They lived happily together fourteen years. Several hundred worked for many years built the Taj Mahal. It is of the most beautiful buildings in the world. Hundreds of people visit every year.",
        "Shahjahan had only one wife. Most kings in those days had many wives. Mumtaz loved her husband dearly. They lived happily together for fourteen years. Several hundred workers worked for many years to build the Taj Mahal. It is one of the most beautiful buildings in the world. Hundreds of people visit it every year.", input_type="textarea") ]})
    exercise["groups"] = result


def main() -> None:
    raw = json.loads(RAW_PATH.read_text(encoding="utf-8"))
    data = json.loads(BASE_PATH.read_text(encoding="utf-8"))
    answers = {chapter: raw_answers(raw, chapter) for chapter in range(1, 13)}

    # Remove worked examples and teaching headings accidentally represented as questions.
    for c, e, prompt_start in [
        (3, 7, "Do you mind (I, smoke)"), (4, 9, "My wife was angry with me"),
        (4, 10, "I covered my books with brown paper"), (7, 17, "She doesn't understand how she can do this exercise"),
    ]:
        exercise = get_exercise(data, c, e)
        for group in exercise["groups"]:
            group["items"] = [item for item in group["items"] if not item["prompt"].startswith(prompt_start)]
        exercise["groups"] = [group for group in exercise["groups"] if group["items"]]

    e13 = get_exercise(data, 6, 13)
    e13["groups"][0]["items"] = [item for item in e13["groups"][0]["items"] if not item["prompt"].startswith("‘Who’ in place")]

    e14 = get_exercise(data, 6, 14)
    items14 = [item for item in flatten(e14) if not item["prompt"].startswith("‘That’/‘Which’")]
    cutoff = next((i for i, item in enumerate(items14) if item["prompt"].startswith("(a) I have lost")), len(items14))
    items14 = split_merged_pairs(items14[:cutoff])
    e14["groups"] = [{"instruction": "Combine each pair of sentences using a relative pronoun.", "items": items14}]

    e15 = get_exercise(data, 6, 15)
    items15 = split_merged_pairs(flatten(e15))
    items15[-1]["prompt"] = "This is the patient. His colon is to be removed."
    items15[-1]["promptHtml"] = items15[-1]["prompt"]
    e15["groups"] = [{"instruction": "Combine each pair of sentences using a relative pronoun.", "items": items15}]

    # Chapter 9, Exercise 21 begins with two worked examples; the real list starts after them.
    c9raw = raw_chapter(raw, 9)
    real21 = [item for item in c9raw[30:48] if item["type"] == "p" and item["is_list"] and item["plain"].strip()]
    e21 = get_exercise(data, 9, 21)
    e21["groups"] = [{"instruction": "Rewrite in the affirmative, replacing many, much or far with an appropriate phrase.", "items": [question(item["plain"].strip(), prompt_html=item["html"]) for item in real21]}]

    e22 = get_exercise(data, 9, 22)
    e22_answers = [
        "Mary has gone away too/as well.", "My youngest daughter can swim too/as well.", "We have been there too/as well.",
        "I was in town on Monday too/as well.", "Can we come too/as well?", "Have you read the Ramayana too/as well?",
        "You must watch the saucepans too/as well.", "Did you go and see your grandmother too/as well?",
        "The fruit crops are good this year too/as well.", "Can’t I go to the theatre too/as well?",
        "There are many dangers on land too/as well.", "You can have your cake and eat it too/as well.",
    ]

    e25 = get_exercise(data, 10, 25)
    build_prepositions(e25)
    e26 = get_exercise(data, 11, 26)
    build_phrasal_verbs(raw, e26)
    e12 = get_exercise(data, 12, 12)
    build_grammar_test(e12)

    for chapter in data["chapters"]:
        for exercise in chapter["exercises"]:
            c, e = chapter["number"], exercise["number"]
            if c == 12:
                items = flatten(exercise)
                exercise["itemCount"] = len(items)
                exercise["answerCount"] = sum(1 for item in items if item.get("answer"))
                exercise["generatedAnswerCount"] = exercise["answerCount"]
                exercise["missingAnswerCount"] = sum(1 for item in items if not item.get("answer"))
                continue
            source_answers = list(answers[c].get(e, []))
            if (c, e) == (5, 12):
                source_answers = [item for item in source_answers if not item.startswith("Note:")]
            generated_at = {}
            if (c, e) == (6, 15):
                source_answers.insert(32, "The teacher punished the boys whose homework was incomplete.")
                generated_at[32] = source_answers[32]
            if (c, e) == (10, 25):
                # Keep the corrected example sentences created for the first group;
                # the book key then maps to the 60 fill-in questions.
                generated_examples = [item["answer"] for item in exercise["groups"][0]["items"]]
                source_answers = generated_examples + source_answers[25:]
                generated_at.update({index: answer for index, answer in enumerate(generated_examples)})
            if (c, e) == (9, 22):
                for item, answer in zip(flatten(exercise), e22_answers):
                    item["answer"] = answer; item["answerSource"] = "generated"; item["inputType"] = "text"
                exercise["itemCount"] = len(flatten(exercise)); exercise["answerCount"] = len(flatten(exercise)); exercise["generatedAnswerCount"] = len(flatten(exercise)); exercise["missingAnswerCount"] = 0
                continue
            reset_answers(exercise, source_answers, generated_at)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = ["# Volume I Final Content Audit", "", "| Chapter | Exercise | Items | Answers | AI-supplied | Missing |", "|---:|---:|---:|---:|---:|---:|"]
    for chapter in data["chapters"]:
        for exercise in chapter["exercises"]:
            lines.append(f"| {chapter['number']:02d} | {exercise['number']:02d} | {exercise['itemCount']} | {exercise['answerCount']} | {exercise['generatedAnswerCount']} | {exercise['missingAnswerCount']} |")
    REPORT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
