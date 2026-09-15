"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  findQuizSources, isQuizQuestion, makeQuizOptions, shuffled,
  type QuizOption, type QuizQuestion,
} from "@/lib/quiz";
import type { ThemeColors } from "@/lib/theme";
import type { Quote } from "@/lib/types";
import { RubyText, DEFAULT_TEXT_SCALES, DEFAULT_RUBY_EMPHASIS } from "@/components/RubyText";

interface QuizModeProps {
  category: string;
  colors: ThemeColors;
  notes: readonly Quote[];
  onClose: () => void;
}

interface ActiveQuestion {
  question: QuizQuestion;
  options: QuizOption[];
  selectedId: string | null;
  revealed: boolean;
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return await response.json() as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function QuizMode({ category, colors, notes, onClose }: QuizModeProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [active, setActive] = useState<ActiveQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shown, setShown] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);
  const queueRef = useRef<QuizQuestion[]>([]);
  const lastQuestionIdRef = useRef<string | null>(null);
  const previousOptionsRef = useRef(new Map<string, string[]>());
  const activeRef = useRef<ActiveQuestion | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => { activeRef.current = active; }, [active]);

  const showNext = useCallback((bank: QuizQuestion[]) => {
    if (queueRef.current.length === 0) {
      queueRef.current = shuffled(bank);
      if (queueRef.current.length > 1 && queueRef.current[0].id === lastQuestionIdRef.current) {
        [queueRef.current[0], queueRef.current[1]] = [queueRef.current[1], queueRef.current[0]];
      }
    }
    const question = queueRef.current.shift();
    if (!question) return;
    const previous = previousOptionsRef.current.get(question.id) ?? [];
    const options = makeQuizOptions(question, previous);
    previousOptionsRef.current.set(question.id, options.map((option) => option.id));
    lastQuestionIdRef.current = question.id;
    setActive({ question, options, selectedId: null, revealed: false });
    setShown((value) => value + 1);
  }, []);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/quiz?category=${encodeURIComponent(category)}`, { cache: "no-store" });
      const data = await readJson(response);
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "시험문제를 불러오지 못했습니다.");
      const bank = Array.isArray(data.questions) ? data.questions.filter(isQuizQuestion) : [];
      if (bank.length > 0) {
        setQuestions(bank);
        showNext(bank);
        return;
      }
      setError("이 카테고리에 준비된 시험문제가 없습니다.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "시험문제를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [category, showNext]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadQuestions(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadQuestions]);

  const choose = useCallback((index: number) => {
    setActive((current) => {
      if (!current || current.revealed || !current.options[index]) return current;
      return { ...current, selectedId: current.options[index].id };
    });
  }, []);

  const submitOrNext = useCallback(() => {
    const current = activeRef.current;
    if (!current) return;
    if (current.revealed) {
      showNext(questions);
      return;
    }
    if (!current.selectedId) return;
    const isCorrect = current.options.find((option) => option.id === current.selectedId)?.correct === true;
    setActive({ ...current, revealed: true });
    if (isCorrect) setCorrect((value) => value + 1);
    else setIncorrect((value) => value + 1);
  }, [questions, showNext]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      // Let a note's annotation dialog handle its own keys before resuming the quiz.
      if (dialogRef.current?.querySelector('[role="dialog"]')) return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing || event.repeat) return;
      const target = event.target;
      if (target instanceof HTMLElement
        && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (/^[1-4]$/.test(event.key)) {
        event.preventDefault();
        choose(Number(event.key) - 1);
      } else if (event.code === "Space") {
        event.preventDefault();
        submitOrNext();
      } else if (event.code === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [choose, submitOrNext, onClose]);

  const optionStyle = (option: QuizOption) => {
    if (!active) return {};
    if (active.revealed && option.correct) {
      return { borderColor: colors.textAccent, color: colors.textAccent, backgroundColor: colors.bgSecondary };
    }
    if (active.revealed && option.id === active.selectedId) {
      return { borderColor: colors.textEmphasis, color: colors.textEmphasis, backgroundColor: colors.bgSecondary };
    }
    if (option.id === active.selectedId) {
      return { borderColor: colors.categorySelected, backgroundColor: colors.bgSecondary, color: colors.text };
    }
    return { borderColor: colors.border, backgroundColor: "transparent", color: colors.text };
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${category} 시험문제`}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: colors.border }}>
        <div>
          <p className="text-xs" style={{ color: colors.textMuted }}>{category}</p>
          <p className="text-sm font-semibold">4지선다 · 무한 연습</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border px-3 py-2 text-sm"
          style={{ borderColor: colors.border, color: colors.textMuted }}
        >그만 풀기</button>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col overflow-y-auto px-5 py-6">
        {loading ? (
          <div className="m-auto text-center">
            <p className="text-base">시험문제를 불러오는 중…</p>
          </div>
        ) : error ? (
          <div className="m-auto text-center">
            <p className="text-sm" style={{ color: colors.textEmphasis }}>{error}</p>
            <button
              type="button"
              onClick={() => void loadQuestions()}
              className="mt-4 rounded-xl border px-4 py-2 text-sm"
              style={{ borderColor: colors.border }}
            >다시 시도</button>
          </div>
        ) : active ? (
          <>
            <div className="flex justify-between gap-4 text-xs" style={{ color: colors.textMuted }}>
              <span>{shown}번째 문제</span>
              <span>정답 {correct} · 오답 {incorrect}</span>
            </div>
            <h1 className="mt-7 text-xl font-semibold leading-relaxed">{active.question.question}</h1>
            <div className="mt-6 grid gap-3" role="radiogroup" aria-label="답안">
              {active.options.map((option, index) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={option.id === active.selectedId}
                  aria-keyshortcuts={String(index + 1)}
                  disabled={active.revealed}
                  onClick={() => choose(index)}
                  className="flex min-h-14 items-center gap-3 rounded-xl border px-4 py-3 text-left disabled:opacity-100"
                  style={optionStyle(option)}
                >
                  <span className="w-5 shrink-0 text-sm" style={{ color: colors.textMuted }}>{index + 1}</span>
                  <span>{option.text}</span>
                </button>
              ))}
            </div>
            {active.revealed && (
              <div className="mt-6 border-t pt-5" style={{ borderColor: colors.border }}>
                <p className="font-semibold" style={{
                  color: active.options.find((option) => option.id === active.selectedId)?.correct
                    ? colors.textAccent : colors.textEmphasis,
                }}>
                  {active.options.find((option) => option.id === active.selectedId)?.correct ? "맞았습니다" : "틀렸습니다"}
                </p>
                <p className="mt-2 text-sm">정답: {active.question.correctAnswer}</p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: colors.textMuted }}>{active.question.explanation}</p>
                {active.question.sourceIds.length > 0 ? (
                  <details key={shown} className="mt-4 rounded-xl border p-4" style={{ borderColor: colors.border }}>
                    <summary className="cursor-pointer text-sm font-semibold" style={{ color: colors.textAccent }}>
                      원본 노트 보기
                    </summary>
                    {findQuizSources(active.question.sourceIds, notes).map(({ sourceId, note }) => (
                      <section key={sourceId} className="mt-4 border-t pt-4" style={{ borderColor: colors.border }}>
                        {note ? <>
                          <p className="mb-3 text-xs" style={{ color: colors.textMuted }}>{note.category}</p>
                          <RubyText text={note.text} fontSize={16} lineHeight="2"
                            colors={colors} scales={DEFAULT_TEXT_SCALES} rubyEmphasis={DEFAULT_RUBY_EMPHASIS} />
                        </> : <p className="text-sm" style={{ color: colors.textMuted }}>
                          연결된 노트를 찾지 못했습니다. 시트 동기화 후 다시 확인해 주세요.
                        </p>}
                      </section>
                    ))}
                  </details>
                ) : <p className="mt-4 text-xs" style={{ color: colors.textMuted }}>연결된 원본 노트가 없는 문제입니다.</p>}
              </div>
            )}
            <button
              type="button"
              disabled={!active.revealed && !active.selectedId}
              onClick={submitOrNext}
              aria-keyshortcuts="Space"
              className="mt-6 rounded-xl py-3 text-sm font-semibold disabled:opacity-40"
              style={{ backgroundColor: colors.categorySelected, color: colors.categorySelectedText }}
            >
              {active.revealed ? "다음 문제 · Space" : "답 제출 · Space"}
            </button>
            <p className="mt-3 text-center text-xs" style={{ color: colors.textMuted }}>
              1–4 답안 선택 · Space {active.revealed ? "다음 문제" : "답 제출"}
            </p>
          </>
        ) : null}
      </main>
    </div>
  );
}
