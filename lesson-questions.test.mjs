import test from 'node:test';
import assert from 'node:assert/strict';
import {VIDEO_QUESTIONS,questionProgress} from './lesson-questions.js';
import {UNITS} from './book-content.js';
import katex from './vendor/katex/katex.esm.js';

test('questions appear before answers and completed answers survive rewinding',()=>{
 const qs=VIDEO_QUESTIONS.field,timeline=Array.from({length:12},(_,i)=>({start:i*10+1,end:i*10+9}));
 assert.equal(questionProgress(qs,timeline,0)[0].visible,false);
 assert.deepEqual(questionProgress(qs,timeline,2)[0],{visible:true,answered:false,current:true});
 assert.equal(questionProgress(qs,timeline,18)[0].answered,false);
 assert.equal(questionProgress(qs,timeline,19)[0].answered,true);
 const replay=questionProgress(qs,timeline,2,80);
 assert.equal(replay[2].answered,true);
 assert.equal(replay[3].visible,false);
});

test('all question response turns follow their questions',()=>{
 for(const questions of Object.values(VIDEO_QUESTIONS))for(const q of questions){assert.ok(q.answerTurn>=q.turn);assert.ok(q.answer.length>10);}
});

test('new inline component matrices and Gauss equations compile as mathematics',()=>{
 let n=0;
 for(const unit of UNITS)for(const match of (unit.before+unit.after).matchAll(/data-tex="([^"]+)"/g)){
   const tex=match[1].replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&#x27;',"'");
   assert.doesNotThrow(()=>katex.renderToString(tex,{throwOnError:true,strict:'ignore'}),`${unit.id}: ${tex}`);n++;
 }
 assert.ok(n>=6);
});
