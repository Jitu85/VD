"""Finalize Volume II with explicit question groups and corrected answer alignment."""
from __future__ import annotations
import json, re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from structure_volume import answer_sections, chapter_headers

ROOT=Path(__file__).resolve().parents[1]
RAW=json.loads((ROOT/'data/raw/volume-2.json').read_text(encoding='utf-8'))
BASE=json.loads((ROOT/'data/volume-2.json').read_text(encoding='utf-8'))


def chapter_raw(number):
 h=chapter_headers(RAW)[number-1]; return RAW[h['start']+1:h['end']]

def answers_for(number):
 c=chapter_raw(number); i=next(i for i,x in enumerate(c) if x['type']=='p' and x['plain'].strip().lower()=='answers'); return answer_sections(c[i+1:])

def q_from(item, strip_number=False):
 text=item['plain'].strip(); html=item['html']
 if strip_number:
  text=re.sub(r'^\s*(?:\([a-z]\)\s*)?\d+\.\s*','',text,flags=re.I)
  html=re.sub(r'^\s*(?:\([a-z]\)\s*)?\d+\.\s*','',html,flags=re.I)
 return {'prompt':text,'promptHtml':html,'answer':None,'answerSource':'missing','inputType':'text'}

def group(cno,instruction,start,end,strip_number=False):
 c=chapter_raw(cno); return {'instruction':instruction,'items':[q_from(c[i],strip_number) for i in range(start,end+1) if c[i]['type']=='p' and c[i]['plain'].strip()]}

def ex(cno,eno): return next(e for c in BASE['chapters'] if c['number']==cno for e in c['exercises'] if e['number']==eno)

def set_groups(cno,eno,groups): ex(cno,eno)['groups']=groups

def flat(e): return [q for g in e['groups'] for q in g['items']]

def pair(e,answers,generated=None):
 generated=generated or {}
 items=flat(e)
 for i,item in enumerate(items):
  if i in generated: item['answer']=generated[i]; item['answerSource']='generated'
  elif i<len(answers): item['answer']=answers[i]; item['answerSource']='book'
  else: item['answer']=None; item['answerSource']='missing'
 e['itemCount']=len(items); e['answerCount']=sum(bool(x.get('answer')) for x in items); e['generatedAnswerCount']=sum(x.get('answerSource')=='generated' for x in items); e['missingAnswerCount']=sum(not x.get('answer') for x in items)

# Chapter 1
set_groups(1,1,[group(1,'Choose the correct verb to complete each sentence.',59,78),group(1,'Correct the following sentences.',80,94)])
set_groups(1,2,[group(1,'Choose the correct form of the verb.',142,161),group(1,'Correct the following sentences.',163,172)])
set_groups(1,3,[group(1,'Choose the correct verb.',219,238),group(1,'Correct the following sentences.',240,254),group(1,'Choose the correct verb in brackets.',256,285),group(1,'Supply a verb that agrees with its subject.',287,296)])
# Chapter 2
set_groups(2,4,[group(2,'Express each relationship using “of” or the possessive case.',84,103)])
set_groups(2,5,[group(2,'Correct the following sentences.',147,166,True),group(2,'Correct the following sentences.',168,187,True)])
# Chapter 3
set_groups(3,6,[group(3,'Choose the correct pronoun and give a reason.',111,130),group(3,'Choose the correct verb form.',133,142),group(3,'Correct the following sentences.',145,169)])
# Chapter 4
set_groups(4,7,[
 group(4,'Fill in the blanks with “later” or “latter”.',123,127), group(4,'Fill in the blanks with “older” or “elder”.',129,133),
 group(4,'Fill in the blanks with “oldest” or “eldest”.',135,139), group(4,'Fill in the blanks with “latest” or “last”.',141,145),
 group(4,'Fill in the blanks with “a little” or “a few”.',147,152), group(4,'Choose from “few”, “a few”, “little”, or “a little”.',154,163),
 group(4,'Supply the comparative or superlative form of the adjective.',167,181), group(4,'Supply an appropriate comparative or superlative.',184,198),
 group(4,'Correct the following sentences.',201,224)])
set_groups(4,8,[group(4,'Rewrite in the comparative degree without changing the meaning.',238,247),group(4,'Rewrite in the positive degree without changing the meaning.',250,259)])
set_groups(4,9,[group(4,'Rewrite in the positive or comparative degree.',270,279),group(4,'Rewrite in the positive or comparative degree.',282,291),group(4,'Rewrite in the comparative or superlative degree.',294,301),group(4,'Rewrite in the positive or superlative degree.',304,311)])
# Chapter 5
set_groups(5,10,[group(5,'Fill in the blanks with a, an, or the.',75,94),group(5,'Add “the” where necessary.',97,111),group(5,'Add a, an, or the where necessary.',114,128),group(5,'Rewrite the passage with suitable articles.',131,131),group(5,'Rewrite the passage with suitable articles.',133,133),group(5,'Correct the following sentences.',136,148)])
# Chapter 6
set_groups(6,11,[group(6,'Use the simple present or present progressive.',49,68),group(6,'Use the present perfect or present perfect progressive.',73,84),group(6,'Add “since” or “for”.',89,100),group(6,'Use the correct tense and add “since” or “for”.',105,115)])
set_groups(6,12,[group(6,'Use the simple past or past progressive.',162,191),group(6,'Use the simple past or past perfect.',196,210),group(6,'Use the simple past or present perfect.',216,227)])
set_groups(6,13,[group(6,'Use the simple present, simple past, or simple future.',245,264),group(6,'Use the simple future or future progressive.',269,283),group(6,'Use the present perfect, past perfect, or future perfect.',289,308)])
set_groups(6,14,[group(6,'Use the correct form of the verb in brackets.',375,389),group(6,'Supply “if” or “unless”.',392,405),group(6,'Use the correct tense form of the verb.',408,432),group(6,'Correct the following sentences.',435,459)])
# Chapters 7–9
set_groups(7,15,[group(7,'Rewrite using the adverb in brackets.',96,107),group(7,'Choose the correct word for each blank.',110,124),group(7,'Correct the following sentences.',127,156,True)])
set_groups(8,16,[group(8,'Fill in the blanks with appropriate prepositions.',179,203),group(8,'Correct the following sentences.',206,225)])
set_groups(9,17,[group(9,'Choose the correct conjunction.',120,144),group(9,'Fill in the blanks with suitable conjunctions.',147,171),group(9,'Correct the following sentences.',174,193)])
set_groups(9,18,[group(9,'Rewrite using the conjunction in brackets.',230,254)])

all_answers={c:answers_for(c) for c in range(1,10)}
# Repair extraction artifacts and corrupt answer-key lines.
a5=all_answers[2][5]; a5[7]=a5[7]+'30'+a5[8]; del a5[8]
a6=all_answers[3][6]; del a6[4]
a9=[f'{a} / {b}' for a,b in zip(all_answers[4][9][::2],all_answers[4][9][1::2])]
all_answers[4][9]=a9
a14=all_answers[6][14]; all_answers[6][14]=a14[:28]+['Unless']+a14[33:]
all_answers[9][18]=[x for x in all_answers[9][18] if 'END OF PART' not in x.upper()]

# Corrections to demonstrably faulty source answers.
overrides={
 (2,4,19):"men's clothes",
 (2,5,3):'Many B.A.s and M.A.s are without jobs.',
 (2,5,14):'I have bought much new machinery.',
 (2,5,25):'The police are looking into the case.',
 (2,5,35):'Alms were given to the poor.',
 (3,6,44):'She overate and fell ill.',
 (3,6,45):'Only you and I can do it.',
 (3,6,49):'Neither of the two boys has brought his books.',
 (6,11,34):'I have not seen you for a long time.',
 (9,17,59):'Neither my father nor my mother was at home.',
}
for c in BASE['chapters']:
 for e in c['exercises']:
  key=(c['number'],e['number']); ans=list(all_answers[c['number']].get(e['number'],[])); generated={}
  for (oc,oe,index),value in overrides.items():
   if key==(oc,oe):
    if index<len(ans): ans[index]=value
    generated[index]=value
  pair(e,ans,generated)

out=ROOT/'src/data/volume-2.json'; out.write_text(json.dumps(BASE,ensure_ascii=False,indent=2),encoding='utf-8')
lines=['# Volume II Final Content Audit','','| Chapter | Exercise | Items | Answers | Corrected | Missing |','|---:|---:|---:|---:|---:|---:|']
for c in BASE['chapters']:
 for e in c['exercises']:
  lines.append(f"| {c['number']:02d} | {e['number']:02d} | {e['itemCount']} | {e['answerCount']} | {e['generatedAnswerCount']} | {e['missingAnswerCount']} |")
(ROOT/'data/reports/volume-2-final-audit.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print('\n'.join(lines))

