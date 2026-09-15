import { NextRequest, NextResponse } from "next/server";
import { sheetReadUrl } from "@/lib/config";
import { isQuizQuestion, type QuizQuestion } from "@/lib/quiz";

const SCRIPT_TIMEOUT_MS = 20000;

function scriptUrl(): string | null {
  try {
    const url = sheetReadUrl("quiz");
    url.search = "";
    return url.toString();
  } catch {
    return null;
  }
}

async function fetchStoredQuestions(category: string): Promise<QuizQuestion[]> {
  const base = scriptUrl();
  if (!base) throw new Error("시험문제 시트 연결이 설정되지 않았습니다.");
  const url = new URL(base);
  url.searchParams.set("format", "quiz");
  url.searchParams.set("category", category);
  const response = await fetch(url, {
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(SCRIPT_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error("시험문제 시트를 읽지 못했습니다.");
  const data = await response.json() as { questions?: unknown; error?: unknown };
  if (typeof data.error === "string") throw new Error(data.error);
  return Array.isArray(data.questions) ? data.questions.filter(isQuizQuestion) : [];
}

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category")?.trim() ?? "";
  if (!category) return NextResponse.json({ error: "카테고리가 필요합니다." }, { status: 400 });
  try {
    return NextResponse.json({ questions: await fetchStoredQuestions(category) });
  } catch (error) {
    console.error("시험문제 읽기 오류:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "시험문제를 불러오지 못했습니다." }, { status: 502 });
  }
}
