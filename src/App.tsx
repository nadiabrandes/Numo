import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, CircleHelp, Share2, Sparkles, Trophy, X } from 'lucide-react';
import { generateWorksheet, operandText, parseAnswer, signFor, validateAnswer, type Difficulty, type MathExercise, type Status, type WorksheetConfig } from './features/math/engine';
import { difficultyNames, gradeNames, languageLabel, languageNames, localeFor, translations, type Language } from './i18n';
import './styles.css';

declare const __APP_VERSION__: string;

type Screen = 'welcome' | 'setup' | 'worksheet' | 'checking' | 'complete';
type Saved = { screen: Screen; config: WorksheetConfig; exercises: MathExercise[]; completedAt?: string };

const KEY = 'numo.session.v1';
const CONFIG_KEY = 'numo.config.v1';
const LANGUAGE_KEY = 'numo.language.v1';
const initial: WorksheetConfig = { grade: 3, difficulty: 'medium', exerciseCount: 25 };
const format = (text: string, values: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (_match, key: string) => String(values[key] ?? ''));
const normalizeExerciseCount = (count: number) => count === 10 || count === 25 || count === 50 ? count : count < 18 ? 10 : 25;

function getLanguage(): Language {
  try {
    const language = localStorage.getItem(LANGUAGE_KEY);
    return language === 'he' || language === 'en' || language === 'ru' || language === 'ar' ? language : 'he';
  } catch { return 'he'; }
}

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
    return { ...config, exerciseCount: normalizeExerciseCount(config.exerciseCount!) } as WorksheetConfig;
  } catch {
    return null;
  }
}

function LanguagePicker({ language, onChange }: { language: Language; onChange: (language: Language) => void }) {
  return <label className="language-picker"><span className="sr-only">{languageLabel[language]}</span><select aria-label={languageLabel[language]} value={language} onChange={(event) => onChange(event.target.value as Language)}>{(['he', 'en', 'ru', 'ar'] as Language[]).map((item) => <option key={item} value={item}>{languageNames[item]}</option>)}</select></label>;
}

function Mascot({ big = false, label }: { big?: boolean; label: string }) {
  return <div className={`mascot ${big ? 'mascot-big' : ''}`} role="img" aria-label={label}><span className="wand">✦</span><span className="eyes">• •</span><span className="smile">⌣</span></div>;
}

function Logo({ alt }: { alt: string }) {
  return <img className="logo" src={`${import.meta.env.BASE_URL}assets/numo-logo.svg`} alt={alt} />;
}

function App() {
  const [language, setLanguage] = useState<Language>(getLanguage);
  const [saved, setSaved] = useState<Saved>(() => {
    const restored = getSaved();
    return restored ? { ...restored, screen: 'welcome' } : { screen: 'welcome', config: initial, exercises: [] };
  });
  const [draft, setDraft] = useState<WorksheetConfig>(() => getConfig() ?? (saved.config ? { ...saved.config, exerciseCount: normalizeExerciseCount(saved.config.exerciseCount) } : initial));
  const [live, setLive] = useState('');
  const [emptySubmission, setEmptySubmission] = useState(false);
  const [shareError, setShareError] = useState(false);
  const t = translations[language];
  const grades = gradeNames[language];
  const difficultyText = difficultyNames[language];
  const direction = language === 'he' || language === 'ar' ? 'rtl' : 'ltr';
  useEffect(() => localStorage.setItem(KEY, JSON.stringify(saved)), [saved]);
  useEffect(() => localStorage.setItem(CONFIG_KEY, JSON.stringify(draft)), [draft]);
  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
    document.title = t.appTitle;
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', t.appDescription);
  }, [language, direction, t]);

  const answered = useMemo(() => saved.exercises.filter((exercise) => parseAnswer(exercise.userAnswer) !== null).length, [saved.exercises]);
  const correctCount = useMemo(() => saved.exercises.filter((exercise) => exercise.status === 'correct').length, [saved.exercises]);
  const accuracy = saved.exercises.length ? Math.round((correctCount / saved.exercises.length) * 100) : 0;
  const completionTitle = accuracy === 100 ? t.complete100 : accuracy >= 80 ? t.complete80 : accuracy >= 50 ? t.complete50 : t.completeLow;
  const completionNote = accuracy === 100
    ? { title: t.congrats100, text: t.congrats100Text }
    : accuracy >= 80
      ? { title: t.congrats80, text: t.congrats80Text }
      : accuracy >= 50
        ? { title: t.congrats50, text: t.congrats50Text }
        : { title: t.congratsLow, text: t.congratsLowText };
  const isWork = saved.screen === 'worksheet' || saved.screen === 'checking';

  function start(config = draft) {
    setSaved({ screen: 'worksheet', config, exercises: generateWorksheet(config) });
    setDraft(config);
    setEmptySubmission(false);
    setLive(t.startPractice);
  }

  function beginSelectedPractice() {
    start(draft);
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
      setLive(t.emptyRequired);
      document.querySelector<HTMLInputElement>('.exercise-row input')?.focus();
      return;
    }
    setEmptySubmission(false);
    const exercises = saved.exercises.map((exercise) => ({ ...exercise, status: validateAnswer(exercise, exercise.userAnswer) as Status }));
    const allCorrect = exercises.length > 0 && exercises.every((exercise) => exercise.status === 'correct');
    const allReviewed = exercises.every((exercise) => exercise.status === 'correct' || exercise.status === 'incorrect');
    const finish = allCorrect || (saved.screen === 'checking' && allReviewed);
    setSaved((current) => ({ ...current, exercises, screen: finish ? 'complete' : 'checking', completedAt: finish ? new Date().toISOString() : undefined }));
    setLive(finish ? t.finishScore : t.fixAnswers);
  }

  function goHome() {
    setDraft({ ...saved.config, exerciseCount: normalizeExerciseCount(saved.config.exerciseCount) });
    setSaved((current) => ({ ...current, screen: 'welcome' }));
  }

  function exportCanvas(): File {
      const canvas = document.createElement('canvas');
      const rows = saved.exercises.length;
      const scale = 2;
      canvas.width = 900 * scale;
      canvas.height = (430 + rows * 96) * scale;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas unavailable');
      context.scale(scale, scale);
      context.fillStyle = '#fff';
      context.fillRect(0, 0, 900, 430 + rows * 96);
      context.fillStyle = '#102c68';
      context.textAlign = 'center';
      context.font = 'bold 42px Arial';
      context.fillText(t.worksheetHeading, 450, 62);
      context.font = 'bold 30px Arial';
      context.fillText(t.worksheetMessage, 450, 112);
      context.font = '22px Arial';
      context.fillText(`${t.gradeWord} ${grades[saved.config.grade - 1]} · ${t.difficultyWord} ${difficultyText[saved.config.difficulty]} · ${new Date().toLocaleDateString(localeFor[language])}`, 450, 156);
      saved.exercises.forEach((exercise, index) => {
        const y = 218 + index * 96;
        context.fillStyle = index % 2 ? '#f7f9ff' : '#eef6ff';
        context.beginPath();
        context.roundRect(54, y, 792, 82, 16);
        context.fill();
        context.fillStyle = '#102c68';
        context.font = 'bold 22px Arial';
        context.textAlign = 'right';
        context.direction = 'rtl';
        context.fillText(`${index + 1}.`, 812, y + 39);
        context.direction = 'ltr';
        context.textAlign = 'left';
        context.fillText(exercise.displayExpression ?? `${operandText(exercise, 'a')} ${signFor(exercise.operation)} ${operandText(exercise, 'b')} =`, 130, y + 34);
        context.font = '18px Arial';
        context.direction = direction;
        context.textAlign = direction === 'rtl' ? 'right' : 'left';
        context.fillText(`${t.answer}: ${exercise.userAnswer || '—'}   ·   ${t.correctAnswer}: ${exercise.correctAnswer}`, direction === 'rtl' ? 846 : 130, y + 64);
      });
      const data = canvas.toDataURL('image/png');
      const image = atob(data.split(',')[1]);
      const bytes = Uint8Array.from(image, (character) => character.charCodeAt(0));
      return new File([bytes], 'numo-worksheet.png', { type: 'image/png' });
  }

  async function sendAnswers() {
    setShareError(false);
    let file: File;
    try {
      file = exportCanvas();
    } catch {
      setLive(t.shareFailed);
      setShareError(true);
      return;
    }

    const shareNavigator = navigator as unknown as { share?: (data: ShareData) => Promise<void> };
    if (typeof shareNavigator.share !== 'function') {
      setLive(t.shareFailed);
      setShareError(true);
      return;
    }
    // Pass the image file directly to the system share sheet. WhatsApp will
    // receive it as an attachment when selected as the share target.
    try {
      await shareNavigator.share({ title: t.shareTitle, text: t.shareText, files: [file] });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setLive(t.shareFailed);
      setShareError(true);
    }
  }

  const languagePicker = <LanguagePicker language={language} onChange={setLanguage} />;

  return (
    <main className={`shell${saved.screen === 'checking' ? ' checking-screen' : ''}${isWork ? ' work-screen' : ''}${saved.screen === 'complete' ? ' complete-screen' : ''}`} dir={direction}>
      <div className="decor d1" />
      <div className="decor d2" />
      <div className="decor d3" />
      <p className="sr-only" aria-live="polite">{live}</p>

      {saved.screen === 'welcome' && <section className="welcome">
        <header className="welcome-top">{languagePicker}</header>
        <div className="brand"><img className="welcome-mascot" src={`${import.meta.env.BASE_URL}assets/numo-mascot.svg`} alt={t.mascotAlt} /><Logo alt={t.logoAlt} /></div>
        <h1>{t.welcomeTitle}</h1>
        <p className="lead">{t.welcomeLead}</p>
        <div className="welcome-actions">
          <button className="primary" onClick={() => setSaved((current) => ({ ...current, screen: 'setup' }))}>{t.start} <span>›</span></button>
          {saved.exercises.some((exercise) => exercise.status !== 'correct') && <button className="outline" onClick={() => setSaved((current) => ({ ...current, screen: current.exercises.some((exercise) => exercise.status === 'incorrect' || exercise.status === 'correct') ? 'checking' : 'worksheet' }))}>{t.resume}</button>}
        </div>
        <small>{t.version} {__APP_VERSION__}</small>
      </section>}

      {saved.screen === 'setup' && <section className="setup">
        <header className="top"><button className="icon-btn" aria-label={t.back} onClick={() => setSaved((current) => ({ ...current, screen: 'welcome' }))}><ArrowLeft /></button><Logo alt={t.logoAlt} /></header>
        <h1 className="page-title">{t.setupTitle}</h1>
        <p className="setup-intro">{draft.grade === 1 ? t.introGradeOne : t.introOther}</p>
        <div className="welcome-card">
          <label>{t.gradeLabel}<select value={draft.grade} onChange={(event) => setDraft({ ...draft, grade: Number(event.target.value) })}>{grades.map((grade, index) => <option key={grade} value={index + 1}>{language === 'he' ? grade : `${t.gradeWord} ${grade}`}</option>)}</select></label>
          <label>{t.difficultyLabel}<select value={draft.difficulty} onChange={(event) => setDraft({ ...draft, difficulty: event.target.value as Difficulty })}>{Object.entries(difficultyText).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>{t.countLabel}<select value={draft.exerciseCount} onChange={(event) => setDraft({ ...draft, exerciseCount: Number(event.target.value) })}>{[10, 25, 50].map((count) => <option key={count} value={count}>{count}</option>)}</select></label>
          <button className="primary" onClick={beginSelectedPractice}>{t.startPractice} <span>›</span></button>
        </div>
      </section>}

      {isWork && <>
        <header className="top"><button className="icon-btn" aria-label={t.back} onClick={() => setSaved((current) => ({ ...current, screen: 'welcome' }))}><ArrowLeft /></button><Logo alt={t.logoAlt} /></header>
        <h1 className="page-title">{saved.screen === 'worksheet' ? t.workTitle : t.checkingTitle}</h1>
        <div className="summary"><span>{t.exercises} <b>{saved.exercises.length}</b></span><span>{t.difficultyWord} <b>{difficultyText[saved.config.difficulty]}</b></span><span>{t.gradeWord} <b>{grades[saved.config.grade - 1]}</b></span></div>
        <div className="progress-line"><span>{answered}/{saved.exercises.length}</span><div className="track"><div style={{ width: `${saved.exercises.length ? answered / saved.exercises.length * 100 : 0}%` }} /></div></div>
        <p className="progress-label">{format(t.progressSentence, { answered, total: saved.exercises.length })}</p>
        {emptySubmission && <p className="empty-submission" role="alert">{t.emptyRequired}</p>}
        {saved.screen === 'checking' && <div className="notice"><Mascot label={t.mascotAlt} />{saved.exercises.some((exercise) => !exercise.userAnswer.trim()) ? t.missingAnswers : t.fixAnswers}</div>}
        <div className="exercise-list">{saved.exercises.map((exercise, index) => <ExerciseRow key={exercise.id} exercise={exercise} index={index} checking={saved.screen === 'checking'} onChange={(value) => update(exercise.id, value)} t={t} />)}</div>
        <button className="primary submit" onClick={check}><Check /> {saved.screen === 'worksheet' ? t.checkAnswers : saved.exercises.some((exercise) => !exercise.userAnswer.trim()) ? t.checkProgress : t.finishScore}</button>
      </>}

      {saved.screen === 'complete' && <section className="complete">
        <header className="top"><button className="icon-btn" aria-label={t.home} onClick={goHome}>{direction === 'rtl' ? <ArrowRight /> : <ArrowLeft />}</button><Logo alt={t.logoAlt} /></header>
        <div className="completion-card">
          <img className="completion-mascot" src={`${import.meta.env.BASE_URL}assets/numo-mascot.svg`} alt={t.mascotCelebrating} />
          <h1>{completionTitle}</h1>
          <div className="stats"><div><Sparkles /><span>{t.exercises}</span><b>{saved.exercises.length}</b></div><div><Check /><span>{t.correct}</span><b>{correctCount}</b></div><div><Trophy /><span>{t.accuracy}</span><b>{accuracy}%</b></div></div>
          <div className="congrats-note"><p><b>{completionNote.title}</b><span>{completionNote.text}</span></p></div>
        </div>
        <button className="primary completion-continue" onClick={() => { setDraft({ ...saved.config, exerciseCount: normalizeExerciseCount(saved.config.exerciseCount) }); setSaved((current) => ({ ...current, screen: 'setup' })); }}>{t.newPractice} {direction === 'rtl' ? <ChevronLeft /> : <ChevronRight />}</button>
        <button type="button" className="outline completion-share" onClick={sendAnswers}><Share2 /> {t.shareResults}</button>
        {shareError && <p className="share-error" role="alert">{t.shareFailed}</p>}
      </section>}

    </main>
  );
}

function ExerciseRow({ exercise, index, checking, onChange, t }: { exercise: MathExercise; index: number; checking: boolean; onChange: (value: string) => void; t: (typeof translations)[Language] }) {
  const status = exercise.status;
  const statusLabel = status === 'correct' ? t.statusCorrect : status === 'incorrect' ? t.statusIncorrect : t.statusUnanswered;
  return <div className={`exercise-row ${checking ? status : ''}`}>
    <span className="number">{index + 1}</span>
    <span className="equation" dir="ltr">{exercise.displayExpression ?? `${operandText(exercise, 'a')} ${signFor(exercise.operation)} ${operandText(exercise, 'b')} =`}</span>
    <label className="sr-only" htmlFor={`answer-${exercise.id}`}>{format(t.exerciseAnswerLabel, { index: index + 1, expression: exercise.displayExpression ?? `${operandText(exercise, 'a')} ${signFor(exercise.operation)} ${operandText(exercise, 'b')}` })}</label>
    <input id={`answer-${exercise.id}`} type="text" inputMode={exercise.displayOperandA || exercise.displayOperandB || exercise.displayExpression ? 'text' : 'decimal'} autoComplete="off" value={exercise.userAnswer} onChange={(event) => onChange(event.target.value)} disabled={checking && status === 'correct'} aria-invalid={checking && status === 'incorrect'} aria-describedby={checking ? `status-${exercise.id}` : undefined} />
    {checking && <span id={`status-${exercise.id}`} className="status" aria-label={statusLabel}>{status === 'correct' ? <Check /> : status === 'incorrect' ? <X /> : <CircleHelp />}<span className="sr-only">{statusLabel}</span></span>}
  </div>;
}

export default App;
