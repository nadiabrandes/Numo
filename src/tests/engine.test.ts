import { describe, expect, it } from 'vitest';
import { generateWorksheet, gradeRules, parseAnswer, validateAnswer, type Difficulty, type MathExercise } from '../features/math/engine';

const exercise: MathExercise = { id: '1', operation: 'addition', operandA: 7, operandB: 5, correctAnswer: 12, userAnswer: '', status: 'unanswered' };

describe('math engine', () => {
  it('uses the requested Grade 1 caps for easy, medium, and hard', () => {
    const caps = { easy: 10, medium: 15, hard: 20 } as const;
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      const worksheet = generateWorksheet({ grade: 1, difficulty, exerciseCount: 50 });
      expect(worksheet).toHaveLength(50);
      worksheet.forEach((item) => {
        expect(['addition', 'subtraction']).toContain(item.operation);
        expect(item.operandA).toBeLessThanOrEqual(caps[difficulty]);
        expect(item.operandB).toBeLessThanOrEqual(caps[difficulty]);
        expect(item.correctAnswer).toBeLessThanOrEqual(caps[difficulty]);
        expect(item.correctAnswer).toBeGreaterThanOrEqual(0);
      });
    }
  });

  it('increases the operation set with each primary grade band', () => {
    expect(gradeRules[1].operations).toEqual(['addition', 'subtraction']);
    expect(gradeRules[2].operations).toEqual(['addition', 'subtraction', 'multiplication', 'division']);
    expect(gradeRules[4].operations).toContain('multiStep');
    expect(gradeRules[5].allowFractionsFrom).toBe('medium');
    expect(gradeRules[6].allowFractionsFrom).toBe('easy');
  });

  it('uses a wider arithmetic range for Grade 3 hard practice', () => {
    const worksheet = generateWorksheet({ grade: 3, difficulty: 'hard', exerciseCount: 100 });
    expect(worksheet.some((item) => item.correctAnswer > 100)).toBe(true);
    worksheet.forEach((item) => expect(Math.abs(item.correctAnswer)).toBeLessThanOrEqual(10000));
  });

  it('generates multi-step expressions in Grades 4–6', () => {
    for (const grade of [4, 5, 6]) {
      const worksheet = generateWorksheet({ grade, difficulty: 'hard', exerciseCount: 50 });
      expect(worksheet.some((item) => item.operation === 'multiStep' && item.displayExpression?.includes('='))).toBe(true);
    }
  });

  it('defines strictly rising difficulty caps within each class profile', () => {
    Object.values(gradeRules).forEach((rule) => {
      expect(rule.naturalCaps.easy).toBeLessThan(rule.naturalCaps.medium);
      expect(rule.naturalCaps.medium).toBeLessThan(rule.naturalCaps.hard);
    });
  });

  it('generates valid results and nonzero divisors for every class and level', () => {
    for (let grade = 1; grade <= 6; grade++) {
      for (const difficulty of ['easy', 'medium', 'hard'] as Difficulty[]) {
        const worksheet = generateWorksheet({ grade, difficulty, exerciseCount: 25 });
        expect(worksheet).toHaveLength(25);
        worksheet.forEach((item) => {
          expect(Number.isFinite(item.correctAnswer)).toBe(true);
          if (item.operation === 'multiStep') {
            expect(item.displayExpression).toBeTruthy();
            return;
          }
          if (item.operation === 'division') expect(item.operandB).not.toBe(0);
          const result = item.operation === 'addition' ? item.operandA + item.operandB
            : item.operation === 'subtraction' ? item.operandA - item.operandB
              : item.operation === 'multiplication' ? item.operandA * item.operandB
                : item.operandA / item.operandB;
          expect(Math.abs(result - item.correctAnswer)).toBeLessThan(1e-8);
        });
      }
    }
  });

  it('avoids duplicates when feasible', () => {
    const worksheet = generateWorksheet({ grade: 3, difficulty: 'easy', exerciseCount: 10 });
    expect(new Set(worksheet.map((item) => `${item.operation}:${item.operandA}:${item.operandB}`)).size).toBe(10);
  });

  it('accepts integer, decimal, comma-decimal, and fraction answers', () => {
    expect(parseAnswer('')).toBeNull();
    expect(validateAnswer(exercise, '12')).toBe('correct');
    expect(validateAnswer(exercise, '11')).toBe('incorrect');
    expect(validateAnswer({ ...exercise, correctAnswer: 1.5 }, '1,5')).toBe('correct');
    expect(validateAnswer({ ...exercise, correctAnswer: 0.75 }, '3/4')).toBe('correct');
    expect(validateAnswer({ ...exercise, correctAnswer: 0.75 }, '1/0')).toBe('incorrect');
    expect(validateAnswer(exercise, 'abc')).toBe('incorrect');
    expect(validateAnswer({ ...exercise, correctAnswer: -2 }, '-2')).toBe('correct');
  });
});
