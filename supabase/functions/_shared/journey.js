import {CATALOG} from './catalog.js';
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const array=value=>Array.isArray(value)?value:[];
const number=value=>Number.isFinite(Number(value))?Math.max(0,Number(value)):0;
export const percent=(done,total)=>total>0?Math.min(100,Math.round(number(done)/number(total)*1000)/10):0;
export const score=value=>value===undefined||value===null?null:Math.min(100,number(value));
function activity(value){if(!value||typeof value!=='object')return null;return {title:String(value.title||'').slice(0,100),status:['active','paused','completed','cancelled'].includes(value.status)?value.status:'active',total:number(value.total),answered:number(value.answered),current:number(value.current),completion:percent(value.answered,value.total),score:score(value.score),updatedAt:value.updatedAt||null};}
function attempts(value,scoreKey='pct'){return array(value).slice(-10).reverse().map(x=>({title:x.level||x.title||'',total:number(x.n||x.total),score:score(x[scoreKey]),finishedAt:x.at||x.finishedAt||null}));}
export function summarizeJourney(courseState,bankState){
  const course=object(courseState),bank=object(bankState),done=object(course.done),scores=object(course.scores),progress=object(bank.progress),histories=array(bank.history);
  const count=CATALOG.lessons.filter(x=>done[x.id]===true).length;
  const stages=CATALOG.stages.map(s=>{const lessons=CATALOG.lessons.filter(x=>x.stage===s.id),completed=lessons.filter(x=>done[x.id]===true).length;return {...s,completed,total:lessons.length,percent:percent(completed,lessons.length)};});
  const sections=CATALOG.bankSections.map(s=>{const practiced=s.ids.filter(id=>progress[id]),correct=s.ids.filter(id=>progress[id]?.lastCorrect===true);return {id:s.id,ar:s.ar,en:s.en,completed:practiced.length,total:s.readyCount,percent:percent(practiced.length,s.readyCount),accuracy:practiced.length?percent(correct.length,practiced.length):null};});
  let answered=0,correct=0;for(const [id,p] of Object.entries(scores)){if(!CATALOG.lessons.some(x=>x.id===id))continue;answered+=number(p?.n);correct+=Math.min(number(p?.c),number(p?.n));}
  const knownBankIds=new Set(CATALOG.bankSections.flatMap(x=>x.ids)),bankTrained=Object.keys(progress).filter(id=>knownBankIds.has(id)).length;
  let bankAnswered=0,bankCorrect=0;for(const [id,p] of Object.entries(progress)){if(!knownBankIds.has(id))continue;bankAnswered+=number(p?.attempts);bankCorrect+=Math.min(number(p?.correct),number(p?.attempts));}
  const training=histories.filter(x=>x.mode==='practice'),exams=histories.filter(x=>x.mode==='exam'),session=object(bank.session),hasSession=Array.isArray(session.ids)&&!session.finished;
  const activeBank=hasSession?{title:String(session.title||''),status:session.paused?'paused':'active',total:session.ids.length,answered:session.ids.filter(id=>{const a=session.answers?.[id];return Array.isArray(a)?a.length>0:a&&typeof a==='object'?Object.values(a).some(x=>Array.isArray(x)&&x.length):false;}).length,current:number(session.index)+1,mode:session.mode}:null;
  if(activeBank)activeBank.completion=percent(activeBank.answered,activeBank.total);
  const activities=object(course.activities),featureStats=object(course.featureStats);
  const practice=object(featureStats.course_practice),checkpoint=object(featureStats.lesson_quiz);
  return {course:{completed:count,total:CATALOG.lessons.length,percent:percent(count,CATALOG.lessons.length),currentLesson:CATALOG.lessons.find(x=>x.id===course.current)||null,stages},
    features:[
      {id:'lesson_quiz',ar:'كويزات الدروس',en:'Lesson checkpoints',answered:number(checkpoint.answered),accuracy:number(checkpoint.answered)?percent(checkpoint.correct,checkpoint.answered):null,current:activity(activities.lesson_quiz)},
      {id:'course_practice',ar:'تدريب المنصة',en:'Course practice',answered:number(practice.answered),accuracy:number(practice.answered)?percent(practice.correct,practice.answered):null,current:activity(activities.course_practice)},
      {id:'level_assessment',ar:'اختبار المستوى',en:'Level assessments',completed:array(course.assessments).length,latestScore:score(array(course.assessments).at(-1)?.pct),current:activity(activities.level_assessment),history:attempts(course.assessments)},
      {id:'mock',ar:'المحاكاة',en:'Mock exams',completed:array(course.attempts).length,latestScore:score(array(course.attempts).at(-1)?.pct),current:activity(activities.mock),history:attempts(course.attempts)},
      {id:'bank_practice',ar:'تدريب بنك الأسئلة',en:'Question bank practice',completed:bankTrained,total:CATALOG.bankTotal,percent:percent(bankTrained,CATALOG.bankTotal),answered:bankAnswered,accuracy:bankAnswered?percent(bankCorrect,bankAnswered):null,sessions:training.length,latestScore:score(training[0]?.percent),current:activeBank?.mode==='practice'?activeBank:null,history:attempts([...training].reverse(),'percent')},
      {id:'bank_exam',ar:'اختبارات بنك الأسئلة',en:'Question bank exams',completed:exams.length,latestScore:score(exams[0]?.percent),current:activeBank?.mode==='exam'?activeBank:null,history:attempts([...exams].reverse(),'percent')}
    ],legacyTraining:{answered,accuracy:answered?percent(correct,answered):null},bankSections:sections,mistakes:{course:array(course.mistakes).length,bank:Object.values(progress).filter(p=>p?.lastCorrect===false).length}};
}
export {CATALOG};
