import test from 'node:test';
import assert from 'node:assert/strict';
import { moduleBQuestions } from '../src/data/module-b-questions.ts';

const subjects = ['Mathematics', 'Science', 'Computer'];
const difficulties = ['Easy', 'Medium', 'Hard'];

test('contains a balanced ten-question launch bank for every subject and difficulty', () => {
  assert.equal(moduleBQuestions.length, 90);
  for (const subject of subjects) {
    for (const difficulty of difficulties) {
      const count = moduleBQuestions.filter(
        (question) => question.subject === subject && question.difficulty === difficulty,
      ).length;
      assert.equal(count, 10, `${subject}/${difficulty} should contain 10 questions`);
    }
  }
});

test('uses unique IDs, four unique options, and one valid answer per question', () => {
  const ids = new Set();
  for (const question of moduleBQuestions) {
    assert.equal(ids.has(question.id), false, `duplicate id ${question.id}`);
    ids.add(question.id);
    assert.equal(question.options.length, 4, `${question.id} should have four options`);
    assert.equal(
      new Set(question.options.map((option) => option.trim())).size,
      4,
      `${question.id} should have four distinct displayed options`,
    );
    assert.ok(Number.isInteger(question.correctIndex));
    assert.ok(question.correctIndex >= 0 && question.correctIndex < 4);
    assert.ok(question.prompt.trim().length >= 20);
    assert.ok(question.explanation.trim().length >= 35);
  }
});

test('contains no questions that depend on a missing visual', () => {
  const visualDependency = /\b(figure|diagram|graph|shown below|shown above|as shown)\b/i;
  for (const question of moduleBQuestions) {
    assert.equal(visualDependency.test(question.prompt), false, question.id);
  }
});

test('keeps the specifically advanced mathematics topics in Hard', () => {
  const advanced = /Trigonometry|Quadratic Equations|Circle Theorems/;
  for (const question of moduleBQuestions.filter((item) => advanced.test(item.topic))) {
    assert.equal(question.difficulty, 'Hard', question.id);
  }
});
