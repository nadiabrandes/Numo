export type Difficulty = 'easy'|'medium'|'hard';
export type Operation = 'addition'|'subtraction'|'multiplication'|'division';
export interface WorksheetConfig { grade:number; difficulty:Difficulty; exerciseCount:number }
export type Status = 'unanswered'|'answered'|'correct'|'incorrect';
export interface MathExercise { id:string; operation:Operation; operandA:number; operandB:number; correctAnswer:number; userAnswer:string; status:Status }
export const gradeRules: Record<number,{max:number;ops:Operation[];negative:boolean;decimal:boolean}> = {
  1:{max:10,ops:['addition','subtraction'],negative:false,decimal:false},2:{max:30,ops:['addition','subtraction'],negative:false,decimal:false},3:{max:50,ops:['addition','subtraction','multiplication','division'],negative:false,decimal:false},4:{max:100,ops:['addition','subtraction','multiplication','division'],negative:false,decimal:false},5:{max:500,ops:['addition','subtraction','multiplication','division'],negative:false,decimal:false},6:{max:1000,ops:['addition','subtraction','multiplication','division'],negative:false,decimal:true},7:{max:1000,ops:['addition','subtraction','multiplication','division'],negative:true,decimal:true},8:{max:2000,ops:['addition','subtraction','multiplication','division'],negative:true,decimal:true},9:{max:5000,ops:['addition','subtraction','multiplication','division'],negative:true,decimal:true}
};
const rand=(n:number)=>Math.floor(Math.random()*n);
const opSign:Record<Operation,string>={addition:'+',subtraction:'−',multiplication:'×',division:'÷'};
export const signFor=(op:Operation)=>opSign[op];
export function generateWorksheet(config:WorksheetConfig):MathExercise[]{
 const rule=gradeRules[config.grade]??gradeRules[3]; const factor=config.difficulty==='easy'?0.4:config.difficulty==='hard'?1.5:0.8; const limit=Math.max(5,Math.round(rule.max*factor)); const set=new Set<string>(); const out:MathExercise[]=[]; const maxAttempts=config.exerciseCount*30;
 for(let attempt=0;out.length<config.exerciseCount&&attempt<maxAttempts;attempt++){
  const op=rule.ops[(attempt+out.length)%rule.ops.length]; let a=rand(limit)+1,b=rand(limit)+1,answer=0;
  if(op==='addition') answer=a+b;
  if(op==='subtraction'){if(!rule.negative&&a<b)[a,b]=[b,a]; answer=a-b;}
  if(op==='multiplication'){a=rand(Math.max(2,Math.ceil(Math.sqrt(limit))))+1;b=rand(Math.max(2,Math.ceil(Math.sqrt(limit))))+1;answer=a*b;}
  if(op==='division'){b=rand(Math.max(2,Math.min(12,Math.floor(Math.sqrt(limit)))))+1;answer=rand(Math.max(2,Math.floor(limit/b)))+1;a=b*answer;}
  if(rule.decimal&&config.difficulty==='hard'&&rand(5)===0){a=(rand(200)+1)/10;b=(rand(100)+1)/10;if(op==='addition')answer=+(a+b).toFixed(1);if(op==='subtraction'){if(!rule.negative&&a<b)[a,b]=[b,a];answer=+(a-b).toFixed(1)}if(op==='multiplication'){a=+(a/10).toFixed(1);answer=+(a*b).toFixed(1)}if(op==='division'){b=(rand(9)+1)/10;a=+(b*(rand(100)+1)).toFixed(1);answer=+(a/b).toFixed(1)}}
  const key=`${op}:${a}:${b}`;if(set.has(key)&&set.size<config.exerciseCount*2)continue;set.add(key);out.push({id:`${Date.now()}-${attempt}-${rand(99999)}`,operation:op,operandA:a,operandB:b,correctAnswer:answer,userAnswer:'',status:'unanswered'});
 }
 while(out.length<config.exerciseCount){const a=rand(limit)+1,b=rand(limit)+1;out.push({id:`fallback-${Date.now()}-${out.length}`,operation:'addition',operandA:a,operandB:b,correctAnswer:a+b,userAnswer:'',status:'unanswered'});}
 return out;
}
export function parseAnswer(value:string):number|null{
 if(!value.trim())return null;const normalized=value.trim().replace(',','.');if(!/^-?(?:\d+\.?\d*|\.\d+)$/.test(normalized))return null;const n=Number(normalized);return Number.isFinite(n)?n:null;
}
export function validateAnswer(exercise:MathExercise,value:string):Status{
 if(!value.trim())return 'unanswered';const n=parseAnswer(value);if(n===null)return 'incorrect';return Math.abs(n-exercise.correctAnswer)<1e-9?'correct':'incorrect';
}
