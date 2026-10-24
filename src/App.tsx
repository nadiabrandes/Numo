import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, ChevronRight, CircleHelp, Home, Share2, Sparkles, Trophy, X } from 'lucide-react';
import { generateWorksheet, operandText, parseAnswer, signFor, validateAnswer, type Difficulty, type MathExercise, type Status, type WorksheetConfig } from './features/math/engine';
import './styles.css';

declare const __APP_VERSION__: string;

type Screen = 'welcome' | 'setup' | 'worksheet' | 'checking' | 'complete';
type Saved = { screen: Screen; config: WorksheetConfig; exercises: MathExercise[]; completedAt?: string };

const KEY = 'numo.session.v1';
const CONFIG_KEY = 'numo.config.v1';
const initial: WorksheetConfig = { grade: 3, difficulty: 'medium', exerciseCount: 25 };
const grades = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳'];
const difficultyText: Record<Difficulty, string> = { easy: 'קל', medium: 'בינוני', hard: 'קשה' };

function getSaved(): Saved | null {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Saved> | null;
    const config = value?.config;
    const operations = ['addition', 'subtraction', 'multiplication', 'division', 'multiStep'];
    const statuses = ['unanswered', 'answered', 'correct', 'incorrect'];
    if (!config || !Number.isInteger(config.grade) || config.grade! < 1 || config.grade! > 6) return null;
    if (!['easy', 'medium', 'hard'].includes(config.difficulty) || ![10, 15, 20, 25, 50].includes(config.exerciseCount)) return null;
    if (!Array.isArray(value?.exercises) || !['welcome', 'setup', 'worksheet', 'checking', 'complete'].includes(value.screen ?? '')) return null;
    if (value.exercises.length && value.exercises.length !== config.exerciseCount) return null;
    for (const exercise of value.exercises) {
      if (!exercise || typeof exercise.id !== 'string' || !operations.includes(exercise.operation)) return null;
      if (![exercise.operandA, exercise.operandB, exercise.correctAnswer].every(Number.isFinite)) return null;
      if (typeof exercise.userAnswer !== 'string' || !statuses.includes(exercise.status)) return null;
    }
    return value as Saved;
  } catch {
    return null;
  }
}

function getConfig(): WorksheetConfig | null {
  try {
    const config = JSON.parse(localStorage.getItem(CONFIG_KEY) ?? 'null') as Partial<WorksheetConfig> | null;
    if (!config || !Number.isInteger(config.grade) || config.grade! < 1 || config.grade! > 6) return null;
    if (!['easy', 'medium', 'hard'].includes(config.difficulty ?? '')) return null;
    if (![10, 15, 20, 25, 50].includes(config.exerciseCount ?? 0)) return null;
    return config as WorksheetConfig;
  } catch {
    return null;
  }
}

function Mascot({ big = false }: { big?: boolean }) {
  return <div className={`mascot ${big ? 'mascot-big' : ''}`} role="img" aria-label="נונו, חבר חשבון שמח"><span className="wand">✦</span><span className="eyes">• •</span><span className="smile">⌣</span></div>;
}

function Logo() {
  return <img className="logo" src={`${import.meta.env.BASE_URL}assets/numo-logo.svg`} alt="Numo" />;
}

function App() {
  const [saved, setSaved] = useState<Saved>(() => getSaved() ?? { screen: 'welcome', config: initial, exercises: [] });
  const [draft, setDraft] = useState<WorksheetConfig>(() => getConfig() ?? saved.config ?? initial);
  const [showConfirm, setShowConfirm] = useState(false);
  const [live, setLive] = useState('');
  const [emptySubmission, setEmptySubmission] = useState(false);

  useEffect(() => localStorage.setItem(KEY, JSON.stringify(saved)), [saved]);
  useEffect(() => localStorage.setItem(CONFIG_KEY, JSON.stringify(draft)), [draft]);

  const answered = useMemo(() => saved.exercises.filter((exercise) => parseAnswer(exercise.userAnswer) !== null).length, [saved.exercises]);
  const correctCount = useMemo(() => saved.exercises.filter((exercise) => exercise.status === 'correct').length, [saved.exercises]);
  const accuracy = saved.exercises.length ? Math.round((correctCount / saved.exercises.length) * 100) : 0;
  const isWork = saved.screen === 'worksheet' || saved.screen === 'checking';

  function start(config = draft) {
    setSaved({ screen: 'worksheet', config, exercises: generateWorksheet(config) });
    setDraft(config);
    setEmptySubmission(false);
    setLive('נוצר דף תרגול חדש');
  }

  function update(id: string, value: string) {
    setEmptySubmission(false);
    setSaved((current) => ({
      ...current,
      exercises: current.exercises.map((exercise) => exercise.id === id ? { ...exercise, userAnswer: value, status: 'answered' } : exercise),
    }));
  }

  function check() {
    if (saved.exercises.every((exercise) => exercise.userAnswer.trim() === '')) {
      setEmptySubmission(true);
      setLive('יש לענות על תרגיל אחד לפחות לפני הצגת הציון.');
      document.querySelector<HTMLInputElement>('.exercise-row input')?.focus();
      return;
    }
    setEmptySubmission(false);
    const exercises = saved.exercises.map((exercise) => ({ ...exercise, status: validateAnswer(exercise, exercise.userAnswer) as Status }));
    const allCorrect = exercises.length > 0 && exercises.every((exercise) => exercise.status === 'correct');
    const finish = allCorrect || saved.screen === 'checking';
    setSaved((current) => ({ ...current, exercises, screen: finish ? 'complete' : 'checking', completedAt: finish ? new Date().toISOString() : undefined }));
    setLive(finish ? 'כל הכבוד!' : 'הבדיקה הסתיימה. אפשר לתקן ולנסות שוב.');
  }

  function goHome() {
    setDraft(saved.config);
    setSaved((current) => ({ ...current, screen: 'welcome' }));
  }

  function exportCanvas(): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const rows = saved.exercises.length;
      const scale = 2;
      canvas.width = 900 * scale;
      canvas.height = (430 + rows * 76) * scale;
      const context = canvas.getContext('2d');
      if (!context) return reject(new Error('Canvas unavailable'));
      context.scale(scale, scale);
      context.fillStyle = '#fff';
      context.fillRect(0, 0, 900, 430 + rows * 76);
      context.fillStyle = '#102c68';
      context.textAlign = 'center';
      context.font = 'bold 42px Arial';
      context.fillText('NUMO — חשבון בכיף', 450, 62);
      context.font = 'bold 30px Arial';
      context.fillText('פתרתי את כל התרגילים בהצלחה!', 450, 112);
      context.font = '22px Arial';
      context.fillText(`כיתה ${grades[saved.config.grade - 1]} · רמה ${difficultyText[saved.config.difficulty]} · ${new Date().toLocaleDateString('he-IL')}`, 450, 156);
      saved.exercises.forEach((exercise, index) => {
        const y = 218 + index * 76;
        context.fillStyle = index % 2 ? '#f7f9ff' : '#eef6ff';
        context.beginPath();
        context.roundRect(54, y, 792, 60, 16);
        context.fill();
        context.fillStyle = '#102c68';
        context.font = 'bold 22px Arial';
        context.textAlign = 'right';
        context.direction = 'rtl';
        context.fillText(`${index + 1}.`, 812, y + 39);
        context.direction = 'ltr';
        context.textAlign = 'left';
        context.fillText(exercise.displayExpression ?? `${operandText(exercise, 'a')} ${signFor(exercise.operation)} ${operandText(exercise, 'b')} = ${exercise.correctAnswer}`, 130, y + 39);
      });
      canvas.toBlob((blob) => blob ? resolve(new File([blob], 'numo-worksheet.png', { type: 'image/png' })) : reject(new Error('PNG export failed')), 'image/png');
    });
  }

  function printWorksheet() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setLive('לא ניתן לפתוח חלון חדש לשמירת PDF');
      return;
    }
    const rows = saved.exercises.map((exercise, index) => `<tr><td>${index + 1}</td><td dir="ltr">${exercise.displayExpression ?? `${operandText(exercise, 'a')} ${signFor(exercise.operation)} ${operandText(exercise, 'b')} = ${exercise.correctAnswer}`}</td></tr>`).join('');
    printWindow.document.write(`<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><title>דף התרגול שלי — NUMO</title><style>body{font-family:Arial,sans-serif;color:#102c68;padding:28px}h1,p{text-align:center}table{border-collapse:separate;border-spacing:0 7px;width:100%}td{padding:12px;background:#f2f7ff;font-size:18px}td:first-child{width:55px;text-align:center;border-radius:0 12px 12px 0}td:last-child{direction:ltr;text-align:left;border-radius:12px 0 0 12px}@media print{tr{break-inside:avoid}}</style><h1>NUMO — חשבון בכיף</h1><p>פתרתי את התרגילים בהצלחה!</p><p>כיתה ${grades[saved.config.grade - 1]} · רמה ${difficultyText[saved.config.difficulty]} · ${new Date(saved.completedAt ?? Date.now()).toLocaleDateString('he-IL')}</p><table>${rows}</table></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  async function share() {
    try {
      const file = await exportCanvas();
      if ('share' in navigator && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: 'דף התרגול שלי', text: 'כל הכבוד! פתרתי את התרגילים.', files: [file] });
        return;
      }
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      link.click();
      URL.revokeObjectURL(url);
      setLive('התמונה נשמרה במכשיר');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      printWorksheet();
    }
  }

  return (
    <main className={`shell${saved.screen === 'checking' ? ' checking-screen' : ''}${isWork ? ' work-screen' : ''}`}>
      <div className="decor d1" />
      <div className="decor d2" />
      <div className="decor d3" />
      <p className="sr-only" aria-live="polite">{live}</p>

      {saved.screen === 'welcome' && <section className="welcome">
        <div className="brand"><img className="welcome-mascot" src={`${import.meta.env.BASE_URL}assets/numo-mascot.svg`} alt="Numo מניף שרביט קסמים" /><Logo /></div>
        <h1>חשבון בכיף</h1>
        <p className="lead">מתרגלים, מתקדמים ומצליחים</p>
        <div className="welcome-actions">
          <button className="primary" onClick={() => saved.exercises.some((exercise) => exercise.status !== 'correct') ? setShowConfirm(true) : start()}>בואו נתחיל <span>›</span></button>
          {saved.exercises.some((exercise) => exercise.status !== 'correct')
            ? <button className="outline" onClick={() => setSaved((current) => ({ ...current, screen: current.exercises.some((exercise) => exercise.status === 'incorrect' || exercise.status === 'correct') ? 'checking' : 'worksheet' }))}>המשך תרגול שמור</button>
            : <button className="outline" onClick={() => setSaved((current) => ({ ...current, screen: 'setup' }))}>התאמת תרגול</button>}
        </div>
        <small>גרסה {__APP_VERSION__}</small>
      </section>}

      {saved.screen === 'setup' && <section className="setup">
        <header className="top"><button className="icon-btn" aria-label="חזרה" onClick={() => setSaved((current) => ({ ...current, screen: 'welcome' }))}><ArrowLeft /></button><Logo /></header>
        <h1 className="page-title">בוחרים תרגול</h1>
        <p className="setup-intro">{draft.grade === 1 ? 'בכיתה א׳ התרגילים מותאמים לרמה: קל עד 10, בינוני עד 15, וקשה עד 20.' : 'בכל כיתה התרגילים מותאמים לנושאים שנלמדים בה. בכל רמה עולים בהדרגה במספרים ובמורכבות.'}</p>
        <div className="welcome-card">
          <label>בחרו כיתה<select value={draft.grade} onChange={(event) => setDraft({ ...draft, grade: Number(event.target.value) })}>{grades.map((grade, index) => <option key={grade} value={index + 1}>{grade}</option>)}</select></label>
          <label>בחרו רמה<select value={draft.difficulty} onChange={(event) => setDraft({ ...draft, difficulty: event.target.value as Difficulty })}>{Object.entries(difficultyText).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>כמה תרגילים?<select value={draft.exerciseCount} onChange={(event) => setDraft({ ...draft, exerciseCount: Number(event.target.value) })}>{[10, 15, 20, 25, 50].map((count) => <option key={count} value={count}>{count}</option>)}</select></label>
          <button className="primary" onClick={() => start()}>התחילו לתרגל <span>›</span></button>
        </div>
      </section>}

      {isWork && <>
        <header className="top"><button className="icon-btn" aria-label="חזרה" onClick={() => setSaved((current) => ({ ...current, screen: 'welcome' }))}><ArrowLeft /></button><Logo /></header>
        <h1 className="page-title">{saved.screen === 'worksheet' ? 'פותרים תרגילים' : 'בדיקת תשובות'}</h1>
        <div className="summary"><span>תרגילים <b>{saved.exercises.length}</b></span><span>רמה <b>{difficultyText[saved.config.difficulty]}</b></span><span>כיתה <b>{grades[saved.config.grade - 1]}</b></span></div>
        <div className="progress-line"><span>{answered}/{saved.exercises.length}</span><div className="track"><div style={{ width: `${saved.exercises.length ? answered / saved.exercises.length * 100 : 0}%` }} /></div></div>
        <p className="progress-label">ענית על {answered} מתוך {saved.exercises.length} תרגילים</p>
        {emptySubmission && <p className="empty-submission" role="alert">יש לענות על תרגיל אחד לפחות לפני הצגת הציון.</p>}
        {saved.screen === 'checking' && <div className="notice"><Mascot />יש כמה תרגילים שצריך לתקן. נסו שוב!</div>}
        <div className="exercise-list">{saved.exercises.map((exercise, index) => <ExerciseRow key={exercise.id} exercise={exercise} index={index} checking={saved.screen === 'checking'} onChange={(value) => update(exercise.id, value)} />)}</div>
        <div className="worksheet-mascot"><Mascot /></div>
        <button className="primary submit" onClick={check}><Check /> {saved.screen === 'worksheet' ? 'בדיקת תשובות' : 'סיום והצגת ציון'}</button>
      </>}

      {saved.screen === 'complete' && <section className="complete">
        <header className="top"><button className="icon-btn" aria-label="חזרה למסך הבית" onClick={goHome}><ArrowLeft /></button><Logo /></header>
        <h1>כל הכבוד!</h1>
        <p className="lead">{accuracy === 100 ? 'פתרת את כל התרגילים בהצלחה!' : `ענית נכון על ${correctCount} מתוך ${saved.exercises.length} תרגילים.`}</p>
        <img className="completion-mascot" src={`${import.meta.env.BASE_URL}assets/numo-mascot.svg`} alt="Numo חוגג עם שרביט קסמים" />
        <div className="stats"><div><Sparkles /><span>תרגילים</span><b>{saved.exercises.length}</b></div><div><Check /><span>נכונים</span><b>{correctCount}</b></div><div><Trophy /><span>דיוק</span><b>{accuracy}%</b></div></div>
        <p className="date">הושלם בתאריך {new Date(saved.completedAt ?? Date.now()).toLocaleDateString('he-IL')}</p>
        <div className="congrats-note"><Trophy aria-hidden="true" /><p><b>{accuracy === 100 ? 'כל הכבוד!' : 'התקדמות נהדרת!'}</b><span>{accuracy === 100 ? 'את/ה משתפר/ת ממש!' : 'כל תרגיל מקרב אותך להצלחה!'}</span></p></div>
        <button className="primary completion-continue" onClick={() => start(saved.config)}>המשך לתרגילים חדשים <ChevronRight /></button>
        <button className="outline completion-home" onClick={goHome}><Home /> חזרה למסך הבית</button>
        <details className="export-options"><summary>שיתוף והורדת דף התרגול</summary><div><button className="text-btn" onClick={share}><Share2 /> שתף להורה</button><button className="text-btn" onClick={printWorksheet}>הורדת PDF</button></div></details>
        <small>גרסה {__APP_VERSION__}</small>
      </section>}

      {showConfirm && <div className="modal-backdrop" role="presentation"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><h2 id="confirm-title">להתחיל תרגול חדש?</h2><p>ההתקדמות הנוכחית תימחק.</p><div><button className="outline" onClick={() => setShowConfirm(false)}>ביטול</button><button className="primary" onClick={() => { setShowConfirm(false); setSaved({ screen: 'setup', config: draft, exercises: [] }); }}>תרגול חדש</button></div></div></div>}
    </main>
  );
}

function ExerciseRow({ exercise, index, checking, onChange }: { exercise: MathExercise; index: number; checking: boolean; onChange: (value: string) => void }) {
  const status = exercise.status;
  const statusLabel = status === 'correct' ? 'תשובה נכונה' : status === 'incorrect' ? 'תשובה שגויה' : 'לא נענתה';
  return <div className={`exercise-row ${checking ? status : ''}`}>
    <span className="number">{index + 1}</span>
    <span className="equation" dir="ltr">{exercise.displayExpression ?? `${operandText(exercise, 'a')} ${signFor(exercise.operation)} ${operandText(exercise, 'b')} =`}</span>
    <label className="sr-only" htmlFor={`answer-${exercise.id}`}>תשובה לתרגיל {index + 1}: {exercise.displayExpression ?? `${operandText(exercise, 'a')} ${signFor(exercise.operation)} ${operandText(exercise, 'b')}`}</label>
    <input id={`answer-${exercise.id}`} type="text" inputMode={exercise.displayOperandA || exercise.displayOperandB || exercise.displayExpression ? 'text' : 'decimal'} autoComplete="off" value={exercise.userAnswer} onChange={(event) => onChange(event.target.value)} disabled={checking && status === 'correct'} aria-invalid={checking && status === 'incorrect'} aria-describedby={checking ? `status-${exercise.id}` : undefined} />
    {checking && <span id={`status-${exercise.id}`} className="status" aria-label={statusLabel}>{status === 'correct' ? <Check /> : status === 'incorrect' ? <X /> : <CircleHelp />}<span className="sr-only">{statusLabel}</span></span>}
  </div>;
}

export default App;
