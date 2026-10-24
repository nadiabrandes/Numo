export type Difficulty = 'easy' | 'medium' | 'hard';
export type Operation = 'addition' | 'subtraction' | 'multiplication' | 'division' | 'multiStep';
export interface WorksheetConfig { grade: number; difficulty: Difficulty; exerciseCount: number }
export type Status = 'unanswered' | 'answered' | 'correct' | 'incorrect';
export interface MathExercise {
  id: string;
  operation: Operation;
  operandA: number;
  operandB: number;
  correctAnswer: number;
  displayOperandA?: string;
  displayOperandB?: string;
  displayExpression?: string;
  userAnswer: string;
  status: Status;
}

export interface GradeRule {
  naturalCaps: Record<Difficulty, number>;
  operations: Operation[];
  allowNegative: boolean;
  allowFractionsFrom: Difficulty | null;
}

// These are arithmetic practice scopes based on Ministry class topics, not a
// claim that a single arithmetic app covers the complete Israeli curriculum.
export const gradeRules: Record<number, GradeRule> = {
  1: { naturalCaps: { easy: 10, medium: 15, hard: 20 }, operations: ['addition', 'subtraction'], allowNegative: false, allowFractionsFrom: null },
  2: { naturalCaps: { easy: 20, medium: 50, hard: 100 }, operations: ['addition', 'subtraction', 'multiplication', 'division'], allowNegative: false, allowFractionsFrom: null },
  3: { naturalCaps: { easy: 100, medium: 1000, hard: 10000 }, operations: ['addition', 'subtraction', 'multiplication', 'division'], allowNegative: false, allowFractionsFrom: null },
  4: { naturalCaps: { easy: 1000, medium: 10000, hard: 100000 }, operations: ['addition', 'subtraction', 'multiplication', 'division', 'multiStep'], allowNegative: false, allowFractionsFrom: null },
  5: { naturalCaps: { easy: 10000, medium: 100000, hard: 1000000 }, operations: ['addition', 'subtraction', 'multiplication', 'division', 'multiStep'], allowNegative: false, allowFractionsFrom: 'medium' },
  6: { naturalCaps: { easy: 100000, medium: 1000000, hard: 10000000 }, operations: ['addition', 'subtraction', 'multiplication', 'division', 'multiStep'], allowNegative: false, allowFractionsFrom: 'easy' }
};

const randomInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const tierOrder: Difficulty[] = ['easy', 'medium', 'hard'];
const opSigns: Record<Exclude<Operation, 'multiStep'>, string> = { addition: '+', subtraction: '−', multiplication: '×', division: '÷' };
export const signFor = (operation: Operation) => operation === 'multiStep' ? '' : opSigns[operation];

function generateMultiStepExercise(grade: number, difficulty: Difficulty): [string, number] {
  const cap = gradeRules[grade].naturalCaps[difficulty];
  if (grade === 4) {
    const b = randomInt(2, 9); const c = randomInt(2, 9);
    const a = randomInt(10, Math.max(10, cap - b * c));
    return [`${a} + ${b} × ${c} = ?`, a + b * c];
  }
  if (grade === 5) {
    const c = randomInt(2, 5); const b = randomInt(2, 5);
    const a = randomInt(2, Math.max(2, Math.floor(cap / c) - b));
    return [`(${a} + ${b}) × ${c} = ?`, (a + b) * c];
  }
  const factor = Math.max(2, Math.floor(Math.sqrt(cap / 4)));
  const a = randomInt(2, factor); const b = randomInt(2, factor);
  const c = randomInt(2, factor); const d = randomInt(2, factor);
  return [`${a} × ${b} + ${c} × ${d} = ?`, a * b + c * d];
}
function grade1Cap(config: WorksheetConfig): number {
  return gradeRules[1].naturalCaps[config.difficulty];
}

function canUseFractions(grade: number, difficulty: Difficulty): boolean {
  const rule = gradeRules[grade] ?? gradeRules[3];
  return rule.allowFractionsFrom !== null && tierOrder.indexOf(difficulty) >= tierOrder.indexOf(rule.allowFractionsFrom);
}

function generateGrade1(config: WorksheetConfig, operation: Operation): [number, number, number] {
  const cap = grade1Cap(config);
  if (config.difficulty === 'hard' && operation === 'addition') {
    const target = cap;
    const a = randomInt(Math.max(1, target - 9), target - 1);
    const b = target - a;
    return [a, b, target];
  }
  if (config.difficulty === 'hard' && operation === 'subtraction') {
    const a = cap;
    const b = randomInt(1, cap - 1);
    return [a, b, a - b];
  }
  const a = randomInt(0, cap);
  const b = randomInt(0, cap);
  if (operation === 'addition') {
    const safeB = randomInt(0, Math.max(0, cap - a));
    return [a, safeB, a + safeB];
  }
  const larger = Math.max(a, b);
  const smaller = Math.min(a, b);
  return [larger, smaller, larger - smaller];
}

function generateFractionExercise(grade: number, difficulty: Difficulty, operation: Operation): [number, number, number, string, string] {
  const denominators = difficulty === 'medium' ? [2, 4] : grade <= 6 ? [2, 4, 5, 10] : [2, 3, 4, 5, 8, 10];
  const denominatorA = denominators[randomInt(0, denominators.length - 1)];
  const denominatorB = denominators[randomInt(0, denominators.length - 1)];
  const numeratorRange = difficulty === 'medium' ? 1 : 4;
  let numeratorA = randomInt(1, numeratorRange);
  let numeratorB = randomInt(1, numeratorRange);
  if ((gradeRules[grade] ?? gradeRules[3]).allowNegative && randomInt(0, 1) === 1) numeratorA *= -1;
  if ((gradeRules[grade] ?? gradeRules[3]).allowNegative && randomInt(0, 1) === 1) numeratorB *= -1;
  const a = numeratorA / denominatorA;
  const b = numeratorB / denominatorB;
  const answer = +(operation === 'addition' ? a + b
    : operation === 'subtraction' ? a - b
      : operation === 'multiplication' ? a * b
        : a / b).toFixed(8);
  return [a, b, answer, `${numeratorA}/${denominatorA}`, `${numeratorB}/${denominatorB}`];
}

function generateIntegerExercise(grade: number, difficulty: Difficulty, operation: Operation): [number, number, number] {
  const rule = gradeRules[grade] ?? gradeRules[3];
  const cap = grade === 1 ? grade1Cap({ grade, difficulty, exerciseCount: 1 }) : rule.naturalCaps[difficulty];

  if (operation === 'multiplication' || operation === 'division') {
    if (grade <= 3) {
      const factorCap = grade === 2 ? (difficulty === 'easy' ? 3 : difficulty === 'medium' ? 5 : 10)
        : grade === 3 ? (difficulty === 'easy' ? 5 : 10) : 10;
      if (operation === 'multiplication') {
        if (grade === 3 && difficulty === 'hard') {
          const b = randomInt(2, 9);
          const largestTens = Math.max(1, Math.floor(cap / (b * 10)));
          const a = randomInt(1, largestTens) * 10;
          return [a, b, a * b];
        }
        const a = randomInt(1, factorCap);
        const b = randomInt(1, Math.min(factorCap, Math.max(1, Math.floor(cap / a))));
        return [a, b, a * b];
      }
      const divisor = randomInt(1, factorCap);
      const quotient = grade === 3 && difficulty === 'hard' ? randomInt(1, Math.floor(cap / divisor)) : randomInt(1, factorCap);
      return [divisor * quotient, divisor, quotient];
    }
    if (operation === 'multiplication') {
      const factorCap = grade === 4
        ? (difficulty === 'easy' ? 9 : difficulty === 'medium' ? 99 : 999)
        : grade === 5
          ? (difficulty === 'easy' ? 99 : difficulty === 'medium' ? 999 : 9999)
          : (difficulty === 'easy' ? 999 : difficulty === 'medium' ? 9999 : 99999);
      const positiveA = randomInt(2, Math.min(factorCap, Math.max(2, Math.floor(cap / 2))));
      const positiveB = randomInt(2, Math.min(factorCap, Math.max(2, Math.floor(cap / positiveA))));
      return [positiveA, positiveB, positiveA * positiveB];
    }
    const divisorCap = grade === 4 ? 99 : grade === 5 ? 999 : 9999;
    const divisor = randomInt(1, Math.min(divisorCap, Math.max(1, Math.floor(Math.sqrt(cap)))));
    const quotient = randomInt(1, Math.max(1, Math.floor(cap / divisor)));
    const signedDivisor = rule.allowNegative && randomInt(0, 1) === 1 ? -divisor : divisor;
    const signedQuotient = rule.allowNegative && randomInt(0, 1) === 1 ? -quotient : quotient;
    return [signedDivisor * signedQuotient, signedDivisor, signedQuotient];
  }

  if (rule.allowNegative) {
    for (let attempt = 0; attempt < 100; attempt++) {
      const a = randomInt(-cap, cap);
      const b = randomInt(-cap, cap);
      const result = operation === 'addition' ? a + b : a - b;
      if (Math.abs(result) <= cap) return [a, b, result];
    }
    return [0, 0, 0];
  }

  const a = randomInt(0, cap);
  const b = randomInt(0, cap);
  if (operation === 'addition') {
    const safeB = randomInt(0, Math.max(0, cap - a));
    return [a, safeB, a + safeB];
  }
  const larger = Math.max(a, b);
  const smaller = Math.min(a, b);
  return [larger, smaller, larger - smaller];
}

export function generateWorksheet(config: WorksheetConfig): MathExercise[] {
  const grade = gradeRules[config.grade] ? config.grade : 3;
  const normalizedConfig = { ...config, grade };
  const rule = gradeRules[grade];
  const expressions = new Set<string>();
  const exercises: MathExercise[] = [];
  const attemptsLimit = config.exerciseCount * 100;

  for (let attempt = 0; exercises.length < config.exerciseCount && attempt < attemptsLimit; attempt++) {
    const operation = rule.operations[exercises.length % rule.operations.length];
    const useFractions = operation !== 'multiStep' && grade >= 5 && canUseFractions(grade, config.difficulty) && randomInt(0, config.difficulty === 'medium' ? 7 : 3) === 0;
    let a: number; let b: number; let answer: number; let displayOperandA: string | undefined; let displayOperandB: string | undefined;
    let displayExpression: string | undefined;

    if (operation === 'multiStep') {
      [displayExpression, answer] = generateMultiStepExercise(grade, config.difficulty);
      a = 0; b = 0;
    } else if (grade === 1) {
      [a, b, answer] = generateGrade1(normalizedConfig, operation);
    } else if (useFractions) {
      [a, b, answer, displayOperandA, displayOperandB] = generateFractionExercise(grade, config.difficulty, operation);
    } else {
      [a, b, answer] = generateIntegerExercise(grade, config.difficulty, operation);
    }

    if (![a, b, answer].every(Number.isFinite) || (operation === 'division' && b === 0)) continue;
    const key = operation === 'multiStep' ? `multiStep:${displayExpression}` : `${operation}:${a}:${b}`;
    if (expressions.has(key) && expressions.size < config.exerciseCount * 2) continue;
    expressions.add(key);
    exercises.push({
      id: `${Date.now()}-${attempt}-${randomInt(0, 99999)}`,
      operation,
      operandA: a,
      operandB: b,
      correctAnswer: answer,
      displayOperandA,
      displayOperandB,
      displayExpression,
      userAnswer: '',
      status: 'unanswered'
    });
  }

  while (exercises.length < config.exerciseCount) {
    const operation = rule.operations[exercises.length % rule.operations.length];
    if (operation === 'multiStep') {
      const [displayExpression, answer] = generateMultiStepExercise(grade, config.difficulty);
      exercises.push({ id: `fallback-${Date.now()}-${exercises.length}`, operation, operandA: 0, operandB: 0, correctAnswer: answer, displayExpression, userAnswer: '', status: 'unanswered' });
      continue;
    }
    const [a, b, answer] = grade === 1 ? generateGrade1(normalizedConfig, operation) : generateIntegerExercise(grade, config.difficulty, operation);
    exercises.push({ id: `fallback-${Date.now()}-${exercises.length}`, operation, operandA: a, operandB: b, correctAnswer: answer, userAnswer: '', status: 'unanswered' });
  }
  return exercises;
}

export function operandText(exercise: MathExercise, side: 'a' | 'b'): string {
  return side === 'a' ? exercise.displayOperandA ?? String(exercise.operandA) : exercise.displayOperandB ?? String(exercise.operandB);
}

export function parseAnswer(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(',', '.');
  const fraction = normalized.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    return denominator === 0 ? null : Number(fraction[1]) / denominator;
  }
  if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(normalized)) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

export function validateAnswer(exercise: MathExercise, value: string): Status {
  if (!value.trim()) return 'unanswered';
  const number = parseAnswer(value);
  if (number === null) return 'incorrect';
  return Math.abs(number - exercise.correctAnswer) < 1e-9 ? 'correct' : 'incorrect';
}
