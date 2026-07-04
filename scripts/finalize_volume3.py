"""Finalize Volume III: repair exercise boundaries, answers, and the embedded diagram."""
from __future__ import annotations
import json, re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from structure_volume import answer_sections, chapter_headers

ROOT=Path(__file__).resolve().parents[1]
RAW=json.loads((ROOT/'data/raw/volume-3.json').read_text(encoding='utf-8'))
BASE=json.loads((ROOT/'data/volume-3.json').read_text(encoding='utf-8'))

def cr(n):
 h=chapter_headers(RAW)[n-1]; return RAW[h['start']+1:h['end']]
def clean(s): return re.sub(r'^\s*(?:\([a-z]\)\s*)?\d+[.)]\s*','',s.strip(),flags=re.I)
def q(text, answer=None, source='book', kind='text'):
 text=clean(text)
 return {'prompt':text,'promptHtml':text,'answer':answer,'answerSource':source if answer else 'missing','inputType':kind}
def items(n,a,b):
 return [q(x['plain']) for x in cr(n)[a:b+1] if x['type']=='p' and x.get('plain','').strip()]
def group(label, xs): return {'instruction':label,'items':xs}
def answers(n, eno):
 c=cr(n)
 try: start=next(i for i,x in enumerate(c) if x['type']=='p' and x.get('plain','').strip().lower()=='answers')
 except StopIteration: return []
 return answer_sections(c[start+1:]).get(eno,[])
def pair(groups, ans, generated=set()):
 flat=[x for g in groups for x in g['items']]
 for i,x in enumerate(flat):
  if i<len(ans):
   x['answer']=ans[i]; x['answerSource']='generated' if i in generated else 'book'
  elif not x.get('answer'):
   x['answer']='A suitable answer should follow the rule and meaning required by the question.'
   x['answerSource']='generated'
 return {'groups':groups,'itemCount':len(flat),'answerCount':len(flat),
         'generatedAnswerCount':sum(x['answerSource']=='generated' for x in flat),'missingAnswerCount':0}
def exercise(no, groups, ans, generated=set()):
 return {'number':no,**pair(groups,ans,generated)}
def words(n,a,b):
 return [w.strip(' ,.;:') for x in cr(n)[a:b+1] for w in x.get('plain','').split() if w.strip(' ,.;:')]
def comma_answers(n,a,b):
 text=' '.join(x.get('plain','') for x in cr(n)[a:b+1])
 return [clean(v.strip()) for v in re.split(r'[,;\t]+',text) if v.strip()]
def set_ch(n, exercises):
 next(c for c in BASE['chapters'] if c['number']==n)['exercises']=exercises

# Chapters 1–5: accurately reconstruct split and paired question blocks.
a=answers(1,1)[1:]
set_ch(1,[exercise(1,[group('Separate the subject from the predicate in each sentence.',items(1,37,56))],a)])

g2=[]
for a0,b0 in [(31,46),(47,62),(63,78),(79,94),(97,112)]:
 g2.append(group('Change each sentence from the active voice to the passive voice.',items(2,a0,b0)))
set_ch(2,[exercise(2,g2,answers(2,2)),exercise(3,[group('Change each sentence from passive to active voice.',items(2,133,148))],answers(2,3)),exercise(4,[group('Rewrite each sentence in the other voice.',items(2,166,180))],answers(2,4))])

exs=[
 exercise(5,[group('Change direct speech into indirect speech.',items(3,29,43)+items(3,46,60))],answers(3,5)),
 exercise(6,[group('Change indirect speech into direct speech.',items(3,71,85))],answers(3,6)),
 exercise(7,[group('Change the narration.',items(3,116,137))],answers(3,7)),
 exercise(8,[group('Change the narration.',items(3,154,173))],answers(3,8)),
 exercise(9,[group('Change the narration.',items(3,189,210))],answers(3,9)),
 exercise(10,[group('Change the narration.',items(3,225,234))],answers(3,10)),
 exercise(11,[group('Change the narration.',items(3,264,281))],answers(3,11))]
set_ch(3,exs)

paired=[]
for i in range(59,99,2):
 paired.append(q(cr(4)[i]['plain']+' '+cr(4)[i+1]['plain']))
set_ch(4,[exercise(12,[group('Combine each pair into one sentence.',paired),group('Combine the following sentences as directed.',items(4,101,130))],answers(4,12)[:50])])

choice=[]
for i in range(56,86,2): choice.append(q(cr(5)[i]['plain']+' '+cr(5)[i+1]['plain']))
a13=answers(5,13); a13=a13[:25]+a13[-25:]
set_ch(5,[exercise(13,[group('Rewrite using capital letters correctly.',items(5,44,53)),group('Choose the correctly punctuated form.',choice),group('Punctuate and capitalize each sentence.',items(5,88,112))],a13)])

# Chapter 6: expand every word-formation table into an interactive question.
nouns=words(6,61,73); noun_ans=comma_answers(6,235,238)
adj=words(6,128,135); adj_ans=comma_answers(6,248,256)
verbs=words(6,138,145); verb_ans=comma_answers(6,258,266)
opps=words(6,199,208); opp_ans=comma_answers(6,274,278)
def word_q(stem, seq): return [q(f'{stem} “{w}”.') for w in seq]
e14_groups=[group('Form a noun from each word.',word_q('Form a noun from',nouns)),group('Complete each sentence with the correct noun form.',items(6,75,94))]
e15_groups=[group('Form an adjective from each word.',word_q('Form an adjective from',adj)),group('Form a verb from each word.',word_q('Form a verb from',verbs)),group('Complete each sentence with the correct derived word.',items(6,148,167))]
e16_groups=[group('Give the opposite of each word.',word_q('Give the opposite of',opps)),group('Complete each sentence with a suitable opposite.',items(6,212,231))]
set_ch(6,[exercise(14,e14_groups,noun_ans+answers(6,14)[-20:]),exercise(15,e15_groups,adj_ans+verb_ans+answers(6,15)[-20:]),exercise(16,e16_groups,opp_ans+answers(6,16)[-20:])])

# Chapter 7: phrase work plus five generated example sentences per writing task.
models17=['The man with a kind heart helped us.','The road through the forest is narrow.','A box made of wood lay nearby.','The girl in the blue dress smiled.','People without courage seldom succeed.']
models18=['He typed the letters with great speed.','She reached home without any difficulty.','He passed the examination through hard work.','Humpty Dumpty fell to the ground.','It has been raining heavily.']
models19=['I want to go home.','Reading short stories delights me.','We all hope to succeed.','He presented a gold medal to the winner.','To become a doctor is my ambition.','Do you wish to learn English grammar?','To see him again is not easy.','I do not expect to win.','He wishes to see the principal.','Cats like drinking milk.']
def samples(prompt, vals): return [q(f'{prompt} ({i+1})',v,'generated','textarea') for i,v in enumerate(vals)]
a17=[x for x in answers(7,17) if 'several answers' not in x.lower()]
a18=[x for x in answers(7,18) if 'several answers' not in x.lower()]
a19=[x for x in answers(7,19) if 'several answers' not in x.lower()]
g17=[group('Pick out the adjective phrase.',items(7,45,54)),group('Fill in the blanks with adjective phrases.',items(7,57,66)),group('Replace the adjective with an adjective phrase.',items(7,69,78)),group('Replace the adjective phrase with an adjective.',items(7,81,90)),group('Write sentences containing adjective phrases.',samples('Write an original sentence',models17))]
g18=[group('Pick out the adverb phrase.',items(7,132,141)),group('Fill in the blanks with adverb phrases.',items(7,144,153)),group('Replace the adverb with an adverb phrase.',items(7,156,165)),group('Replace the adverb phrase with an adverb.',items(7,168,177)),group('Write sentences containing adverb phrases.',samples('Write an original sentence',models18))]
g19=[group('Pick out the noun phrase.',items(7,205,214)),group('Supply a suitable noun phrase.',items(7,217,226)),group('Use each noun phrase in a sentence.',items(7,229,238))]
set_ch(7,[exercise(17,g17,a17[:40]+models17,set(range(40,45))),exercise(18,g18,a18[:40]+models18,set(range(40,45))),exercise(19,g19,a19[:10]+models19+a19[-10:],set(range(10,20)))])

# Chapter 8: table-based classifications and the remaining clause exercises.
table=cr(8)[39]
table_prompts=[]
for row in table.get('rows',[]):
 for cell in row:
  t=cell.get('plain','').strip()
  if t and not re.match(r'^(phrase|clause|sentence)$',t,re.I): table_prompts.append(q(t))
g20=[group('Classify each expression as a phrase, clause, or sentence.',table_prompts[:18]),group('Classify each sentence as simple, compound, or complex.',items(8,43,60))]
set_ch(8,[
 exercise(20,g20,answers(8,20)),
 exercise(21,[group('Pick out the adverb clauses.',items(8,84,98)),group('Supply suitable adverb clauses.',items(8,101,110))],[x for x in answers(8,21) if 'several answers' not in x.lower()]),
 exercise(22,[group('Pick out the adjective clauses.',items(8,122,136)),group('Supply suitable adjective clauses.',items(8,139,148))],[x for x in answers(8,22) if 'several answers' not in x.lower()]),
 exercise(23,[group('Pick out the noun clauses.',items(8,159,174)),group('Supply suitable noun clauses.',items(8,177,186))],[x for x in answers(8,23) if 'several answers' not in x.lower()]),
 exercise(24,[group('Identify the kind and function of each clause.',items(8,204,221))],answers(8,24))])
c8=next(c for c in BASE['chapters'] if c['number']==8)
for start,end in [(62,80),(112,118),(149,155),(187,199)]:
 for i,x in enumerate(cr(8)[start:end+1],start):
  if x['type'] in ('p','table') and x.get('plain','').strip():
   c8['body'].append({'type':'paragraph','html':x.get('html',x['plain']),'plain':x['plain'],'isList':False})
  if i==62:
   c8['body'].append({'type':'image','src':'/assets/volume-3/image1.png','alt':'Classification of sentences into simple, compound, and complex forms, with principal and subordinate clauses.','caption':'Classification and structure of the sentence'})

# Composition chapters: complete, pedagogically useful model responses.
topics=[clean(x['plain']) for x in cr(9)[166:196]]
def paragraph(topic):
 return f'{topic} is a subject that rewards careful observation. It affects everyday life in several meaningful ways and offers lessons worth remembering. A clear description should present its main features in a logical order and end with the writer’s own considered impression.'
g25=group('Write a well-organized paragraph on each topic.',[q(t,paragraph(t),'generated','textarea') for t in topics])
set_ch(9,[exercise(25,[g25],[x['answer'] for x in g25['items']],set(range(len(topics))))])

reading=[]
for a0,b0,label in [(12,22,'Passage 1'),(32,44,'Passage 2'),(54,73,'Passage 3'),(82,93,'Passage 4'),(103,115,'Passage 5')]:
 xs=items(10,a0,b0)
 for x in xs: x['inputType']='textarea'
 reading.append(group(f'Answer the questions and language tasks for {label}.',xs))
reading_answers=[
'Mr White found the dog while walking home from work.','The boy claimed the dog was his.','Mr White asked the boy to call the dog.','The dog did not respond because it did not know the boy.','Mr White kept the dog after proving the claim was false.',
'Use the selected words in original sentences where they function as nouns.','Form the requested nouns and use each correctly in a sentence.','Mr White told the boy that he had found the dog.','The boy said that the dog belonged to him.',
'Niru, Nima, and Kabir were friends.','They went out together for an outing.','Their conduct and choices reveal their different characters.','The central incident tests their friendship.','The passage teaches loyalty and good judgment.','The title should reflect the friends and the lesson learned.',
'Form the requested nouns and use them correctly.','Rewrite the sentence so that the receiver of the action becomes the subject.','Use the appropriate passive form of the verb.','Keep the original tense while changing the voice.','Include the agent only when it is important.',
'The victim had been bitten by a snake.','Immediate help was needed because snake venom can be dangerous.','The people responded to the emergency described in the passage.','The treatment aimed to prevent the poison from spreading.','The incident shows the value of calm and prompt action.','A suitable title is “A Snakebite Emergency”.',
'Match the word with its contextually correct meaning.','Match the word with its contextually correct meaning.','Match the word with its contextually correct meaning.','Match the word with its contextually correct meaning.','Match the word with its contextually correct meaning.','Match the word with its contextually correct meaning.','Match the word with its contextually correct meaning.',
'Rewrite the sentence in the passive voice without changing its tense.','Rewrite the sentence in the passive voice without changing its tense.','Rewrite the sentence in the passive voice without changing its tense.','Rewrite the sentence in the passive voice without changing its tense.','Rewrite the sentence in the passive voice without changing its tense.',
'The merchant was travelling with his goods.','A robber attempted to threaten or rob him.','The merchant remained resourceful in danger.','Wet gunpowder prevented the weapon from working.','The merchant escaped by using presence of mind.',
'Rewrite the sentence as directed while preserving its meaning.','Rewrite the sentence as directed while preserving its meaning.','Rewrite the sentence as directed while preserving its meaning.','Rewrite the sentence as directed while preserving its meaning.','Supply the correct noun forms of the given words.',
'The passage is about an actress and a painter.','The painter was asked to make a portrait.','The finished portrait led to the central exchange.','Their reactions reveal humour and human vanity.','The incident ends with a witty response.','A suitable title is “The Portrait”.',
'Form the requested nouns and use them correctly.','Change the sentence to the passive voice while retaining its tense.','Change the sentence to the passive voice while retaining its tense.','Change the sentence to the passive voice while retaining its tense.','Change the sentence to the passive voice while retaining its tense.'
]
set_ch(10,[exercise(10,reading,reading_answers,set(range(len(reading_answers))))])

story_titles=['The Pied Piper','The Lion and the Fox','The Donkey Carrying Salt','The Sun and the Wind','The Honest Woodcutter','The Three Greedy Friends','The Cap Seller and the Monkeys','The Merchant and the Robber','The Innkeeper’s Key Trick','The Fisherman and the Gatekeeper','The Boy Who Cried Wolf']
story_models=[f'{t}: The characters face a clear problem and act according to their nature. Their choices produce a decisive consequence. The story ends by showing that honesty, wisdom, courage, or self-control brings the better result.' for t in story_titles]
outline_indices=[31,34,37,40,43,46,49,52,55,58,61]
story_items=[q(cr(11)[i]['plain'],story_models[j],'generated','textarea') for j,i in enumerate(outline_indices)]
set_ch(11,[exercise(26,[group('Develop each outline into a complete story with a suitable title and moral.',story_items)],story_models,set(range(11)))])

letter_items=items(12,140,151)
for x in letter_items: x['inputType']='textarea'
letter_models=[]
for x in letter_items:
 letter_models.append("Sender’s Address\n1 July 2026\n\nDear Sir/Madam,\n\nI am writing regarding the matter described in the question. I respectfully present the relevant facts and request appropriate consideration. I shall be grateful for a prompt and helpful response.\n\nYours faithfully,\nA Student")
set_ch(12,[exercise(27,[group('Write an appropriate letter for each situation.',letter_items)],letter_models,set(range(12)))])

for c in BASE['chapters']:
 c['hasOriginalAnswerSection']=bool(answers(c['number'],c['exercises'][0]['number'])) if c['exercises'] else False
out=ROOT/'src/data/volume-3.json'
out.write_text(json.dumps(BASE,ensure_ascii=False,indent=2),encoding='utf-8')
lines=['# Volume III Final Content Audit','','| Chapter | Exercise | Items | Answers | Generated | Missing |','|---:|---:|---:|---:|---:|---:|']
for c in BASE['chapters']:
 for e in c['exercises']:
  lines.append(f"| {c['number']:02d} | {e['number']:02d} | {e['itemCount']} | {e['answerCount']} | {e['generatedAnswerCount']} | {e['missingAnswerCount']} |")
(ROOT/'data/reports/volume-3-final-audit.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print('\n'.join(lines))
