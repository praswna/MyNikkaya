import type { Quote } from "@/lib/types";

// Sheet IDs are persistent; Quote.id is only a temporary display identifier.
export function findQuizSources(sourceIds: readonly string[], notes: readonly Quote[]) {
  return Array.from(new Set(sourceIds)).map((sourceId) => ({
    sourceId,
    note: notes.find((note) => note.sheetId === sourceId),
  }));
}

export interface QuizQuestion {
  id: string;
  category: string;
  sourceIds: string[];
  question: string;
  correctAnswer: string;
  distractors: string[];
  explanation: string;
}

export interface QuizOption {
  id: string;
  text: string;
  correct: boolean;
}

export function shuffled<T>(values: readonly T[], random: () => number = Math.random): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function makeQuizOptions(
  question: QuizQuestion,
  previousIds: readonly string[] = [],
  random: () => number = Math.random,
): QuizOption[] {
  const uniqueWrong = Array.from(new Set(
    question.distractors.map((value) => value.trim()).filter(
      (value) => value && value !== question.correctAnswer.trim(),
    ),
  ));
  if (uniqueWrong.length < 3) throw new Error("보기 후보가 부족합니다.");

  const candidates = shuffled(uniqueWrong, random);
  let picked = candidates.slice(0, 3);
  const previousWrong = new Set(previousIds.filter((id) => id !== question.id + ":correct"));
  if (picked.every((text) => previousWrong.has(question.id + ":wrong:" + text))) {
    const fresh = candidates.find((text) => !previousWrong.has(question.id + ":wrong:" + text));
    if (fresh) picked = [fresh, ...picked.slice(1)];
  }

  return shuffled([
    { id: question.id + ":correct", text: question.correctAnswer, correct: true },
    ...picked.map((text) => ({ id: question.id + ":wrong:" + text, text, correct: false })),
  ], random);
}

export function isQuizQuestion(value: unknown): value is QuizQuestion {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  const correctAnswer = typeof item.correctAnswer === "string" ? item.correctAnswer.trim() : "";
  return typeof item.id === "string" && !!item.id
    && typeof item.category === "string" && !!item.category
    && Array.isArray(item.sourceIds) && item.sourceIds.every((id) => typeof id === "string")
    && typeof item.question === "string" && !!item.question.trim()
    && !!correctAnswer
    && Array.isArray(item.distractors)
    && new Set(item.distractors
      .filter((x): x is string => typeof x === "string")
      .map((x) => x.trim())
      .filter((x) => x && x !== correctAnswer)).size >= 3
    && typeof item.explanation === "string";
}
