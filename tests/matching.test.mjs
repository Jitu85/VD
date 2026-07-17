import test from 'node:test';
import assert from 'node:assert/strict';
import { answersMatch } from '../src/lib/matching.ts';

const expectedPassage =
  'Shahjahan had only one wife. Most kings in those days had many wives. Mumtaz loved her husband dearly. They lived happily together for fourteen years. Several hundred workers worked for many years to build the Taj Mahal. It is one of the most beautiful buildings in the world. Hundreds of people visit it every year.';

const submittedPassage =
  'Shahjahan had only one wife. Most of the kings in those days have many wifes. Mumtaz loved her husband dearly. They lived together happily for fourteen years. Several hundreds of workers worked for many years to built the Taj Mahal. It is one of the most beautiful buildings in the world. Hundreds of people came to visit there every year.';

test('accepts case, whitespace, and punctuation variations', () => {
  assert.equal(answersMatch('  SHAHJAHAN had only one wife! ', 'Shahjahan had only one wife.'), true);
});

test('accepts standard contractions and their full forms interchangeably', () => {
  assert.equal(answersMatch("Hide it, or else they'll steal it.", 'Hide it, or else they will steal it.'), true);
  assert.equal(answersMatch("Follow him, or else he'll get away.", 'Follow him, or else he will get away.'), true);
  assert.equal(answersMatch("I've finished.", 'I have finished.'), true);
  assert.equal(answersMatch("We haven't finished.", 'We have not finished.'), true);
  assert.equal(answersMatch("I'm ready and we're leaving.", 'I am ready and we are leaving.'), true);
  assert.equal(answersMatch("You'd better leave.", 'You had better leave.'), true);
  assert.equal(answersMatch("You'd enjoy it.", 'You would enjoy it.'), true);
  assert.equal(answersMatch("She's ready.", 'She is ready.'), true);
  assert.equal(answersMatch("She's finished.", 'She has finished.'), true);
  assert.equal(answersMatch("I can't go unless he doesn't object.", 'I cannot go unless he does not object.'), true);
  assert.equal(answersMatch("Let's begin.", 'Let us begin.'), true);
});

test('does not mistake a possessive apostrophe for an auxiliary contraction', () => {
  assert.equal(answersMatch("John's book", 'John is book'), false);
});

test('accepts harmless word-order variation only when requested', () => {
  assert.equal(
    answersMatch(
      'They lived together happily for fourteen years.',
      'They lived happily together for fourteen years.',
      { allowWordOrderVariation: true },
    ),
    true,
  );
  assert.equal(answersMatch('They lived together happily.', 'They lived happily together.'), false);
  assert.equal(answersMatch('Most of the kings', 'Most kings', { allowWordOrderVariation: true }), false);
});

test('rejects the flawed Question 44 submission', () => {
  assert.equal(answersMatch(submittedPassage, expectedPassage, { allowWordOrderVariation: true }), false);
});

test('rejects tense, spelling, and verb-form errors', () => {
  assert.equal(
    answersMatch(
      expectedPassage.replace('had many wives', 'have many wives'),
      expectedPassage,
      { allowWordOrderVariation: true },
    ),
    false,
  );
  assert.equal(answersMatch('many wifes', 'many wives'), false);
  assert.equal(answersMatch('to built the Taj Mahal', 'to build the Taj Mahal'), false);
});

test('does not treat grammatical uses of or as answer separators', () => {
  assert.equal(answersMatch('You must hurry', 'You must hurry, or else you will catch cold.'), false);
});

test('continues to accept explicitly supplied alternatives', () => {
  assert.equal(answersMatch('colour', 'color / colour'), true);
  assert.equal(answersMatch('I am so glad to see you.', 'I am very glad to see you. (or) I am so glad to see you.'), true);
});
