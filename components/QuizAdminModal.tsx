"use client";

import { useEffect, useState } from "react";
import type { ThemeColors } from "@/lib/theme";
import { loadEditPassword, saveEditPassword } from "@/lib/edit-key";
import { useEscape } from "@/lib/use-escape";
import { extractJsonFilesFromZip, MAX_JSON_BYTES, MAX_ZIP_BYTES, type ExtractedJsonFile } from "@/lib/zip";

type Step = 1 | 2 | 3;
type BatchMode = "uncovered" | "all";
type Batch = { batchId: string; mode?: BatchMode; targetCount: number; copyText: string; stagingName?: string };
type BatchProgress = { mode?: BatchMode; targetCount?: number; resolvedCount?: number; remainingCount?: number; stagingName?: string; readyToApply?: boolean; applied?: boolean; previousSheet?: string };
type ImportResult = BatchProgress & { added: number; duplicates: number; excluded?: number; held: Array<{ id?: string; reason: string }> };
type FileReport = { name: string; status: "saving" | "done" | "error"; summary?: string };
type Draft = { step?: number; batch?: Batch; answer?: string; result?: ImportResult; fileReports?: FileReport[] };
type Action = "createBatch" | "importAnswer" | "batchStatus" | "applyBatch";
const DRAFT_KEY = "quiz_admin_draft";

function loadDraft(): Draft {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}"); } catch { return {}; }
}

export function QuizAdminModal({ colors, onClose, onSaved }: { colors: ThemeColors; onClose: () => void; onSaved: () => void }) {
  const [initialDraft] = useState(loadDraft);
  const [step, setStep] = useState<Step>(initialDraft.step === 2 || initialDraft.step === 3 ? initialDraft.step : 1);
  const [batch, setBatch] = useState<Batch | null>(initialDraft.batch?.copyText ? initialDraft.batch : null);
  const [answer, setAnswer] = useState(initialDraft.answer || "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<ImportResult | null>(initialDraft.result || null);
  const [fileReports, setFileReports] = useState<FileReport[]>(initialDraft.fileReports || []);
  useEscape(!busy, onClose);

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, batch, answer, result, fileReports })); } catch {}
  }, [step, batch, answer, result, fileReports]);

  async function call<T>(action: Action, options: { answer?: string; mode?: BatchMode; batchId?: string; onError?: (message: string) => void } = {}): Promise<T | null> {
    let password = loadEditPassword() || window.prompt("편집 암호를 입력하세요.") || "";
    if (!password) return null;
    setMessage("");
    try {
      const send = () => fetch("/api/quiz-admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, password, answer: options.answer, mode: options.mode, batchId: options.batchId }) });
      let response = await send();
      let data = await response.json();
      if (response.status === 401) {
        password = window.prompt("암호가 맞지 않습니다. 다시 입력하세요.") || "";
        if (!password) return null;
        response = await send(); data = await response.json();
      }
      if (!response.ok) throw new Error(data.error || "처리하지 못했습니다.");
      saveEditPassword(password);
      return data as T;
    } catch (error) {
      const detail = error instanceof Error ? error.message : "처리하지 못했습니다.";
      setMessage(detail); options.onError?.(detail);
      return null;
    }
  }

  async function createBatch(mode: BatchMode) {
    setBusy(true);
    try {
      const data = await call<Batch>("createBatch", { mode });
      if (data) { setBatch(data); setAnswer(""); setResult(null); setFileReports([]); setStep(1); }
    } finally { setBusy(false); }
  }

  async function copyAll() {
    if (!batch) return;
    try { await navigator.clipboard.writeText(batch.copyText); setMessage("전체 자료를 복사했습니다."); }
    catch { setMessage("자동 복사에 실패했습니다. 아래 영역을 선택해 직접 복사해주세요."); }
  }

  async function importAnswer(value?: string) {
    setBusy(true);
    try {
      const data = await call<ImportResult>("importAnswer", { answer: value ?? answer });
      if (data) { setResult(data); onSaved(); setStep(3); }
    } finally { setBusy(false); }
  }

  async function importFiles(files: File[]) {
    if (busy || !batch) return;
    if (!files.length) return;
    setBusy(true); setResult(null); setMessage("");
    const candidates: ExtractedJsonFile[] = [];
    const rejected: FileReport[] = [];
    for (const file of [...files].sort((a, b) => a.name.localeCompare(b.name))) {
      const lower = file.name.toLowerCase();
      if (lower.endsWith(".json") && file.size <= MAX_JSON_BYTES) candidates.push(file);
      else if (lower.endsWith(".zip") && file.size <= MAX_ZIP_BYTES) {
        try { candidates.push(...await extractJsonFilesFromZip(file)); }
        catch (error) { rejected.push({ name: file.name, status: "error", summary: error instanceof Error ? error.message : "ZIP 압축 해제 실패" }); }
      } else rejected.push({ name: file.name, status: "error", summary: "JSON은 1.5MB, ZIP은 15MB 이하만 지원" });
    }
    candidates.sort((a, b) => a.name.localeCompare(b.name));
    if (!candidates.length) { setMessage("JSON 파일이나 JSON이 들어 있는 ZIP 파일을 선택해주세요."); setFileReports(rejected); setBusy(false); return; }
    setFileReports([...candidates.map((file): FileReport => ({ name: file.name, status: "saving" })), ...rejected]);
    const total: ImportResult = { added: 0, duplicates: 0, excluded: 0, held: [] };
    let latest: ImportResult | null = null;
    for (const file of candidates) {
      let data: ImportResult | null = null;
      let failure = "저장 실패";
      try { data = await call<ImportResult>("importAnswer", { answer: await file.text(), onError: (detail) => { failure = detail; } }); } catch {}
      if (data) {
        latest = data;
        total.added += data.added;
        total.duplicates += data.duplicates;
        total.excluded = (total.excluded || 0) + (data.excluded || 0);
        total.held.push(...data.held.map((item) => ({ ...item, reason: `${file.name}: ${item.reason}` })));
        setFileReports((current) => current.map((report) => report.name === file.name
          ? { name: file.name, status: "done", summary: `추가 ${data.added} · 중복 ${data.duplicates} · 보류 ${data.held.length}` } : report));
      } else {
        setFileReports((current) => current.map((report) => report.name === file.name
          ? { name: file.name, status: "error", summary: failure } : report));
      }
    }
    if (latest) Object.assign(total, { mode: latest.mode, targetCount: latest.targetCount, resolvedCount: latest.resolvedCount, remainingCount: latest.remainingCount, stagingName: latest.stagingName, readyToApply: latest.readyToApply, applied: latest.applied });
    setResult(total); setBusy(false); onSaved(); setStep(3);
  }

  async function refreshStatus() {
    if (!batch) return;
    setBusy(true);
    try {
      const data = await call<BatchProgress>("batchStatus", { batchId: batch.batchId });
      if (data) setResult((current) => ({ added: current?.added || 0, duplicates: current?.duplicates || 0, excluded: current?.excluded || 0, held: current?.held || [], ...data }));
    } finally { setBusy(false); }
  }

  async function applyBatch() {
    if (!batch) return;
    setBusy(true);
    try {
      const data = await call<BatchProgress>("applyBatch", { batchId: batch.batchId });
      if (data) {
        setResult((current) => ({ added: current?.added || 0, duplicates: current?.duplicates || 0, excluded: current?.excluded || 0, held: current?.held || [], ...data }));
        setMessage("새 문제은행을 적용했습니다. 이전 문제은행 탭도 보관했습니다.");
        onSaved();
      }
    } finally { setBusy(false); }
  }

  const button = { backgroundColor: colors.categorySelected, color: colors.categorySelectedText };
  const steps: Array<{ id: Step; label: string }> = [{ id: 1, label: "1. 자료 만들기" }, { id: 2, label: "2. 파일 넣기" }, { id: 3, label: "3. 검토·적용" }];
  return <>
    <div className="fixed inset-0 z-50 bg-black/60" onClick={busy ? undefined : onClose} />
    <div role="dialog" aria-modal="true" aria-label="시험문제 출제" className="fixed inset-x-3 top-1/2 z-50 mx-auto flex max-h-[90dvh] max-w-3xl -translate-y-1/2 flex-col rounded-2xl p-5 shadow-2xl" style={{ backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}`, color: colors.text }}>
      <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">시험문제 출제</h2><button onClick={onClose} disabled={busy} aria-label="닫기">✕</button></div>
      <nav aria-label="출제 단계" className="mb-4 grid grid-cols-3 gap-2">{steps.map((item) => <button key={item.id} onClick={() => setStep(item.id)} disabled={busy} aria-current={step === item.id ? "step" : undefined} className="rounded-xl border px-2 py-2 text-xs font-medium disabled:opacity-50" style={step === item.id ? button : { borderColor: colors.border, backgroundColor: colors.bg }}>{item.label}</button>)}</nav>

      {step === 1 && <>
        <p className="mb-3 text-sm" style={{ color: colors.textMuted }}>연결된 전체 노트 탭에서 출제 범위를 고르세요.</p>
        {batch && <p className="mb-3 text-xs" style={{ color: colors.textMuted }}>새 자료를 만들면 화면에 저장된 현재 출제 묶음이 새 묶음으로 바뀝니다.</p>}
        <div className="mb-3 grid gap-2 sm:grid-cols-2">
          <button disabled={busy} onClick={() => { void createBatch("uncovered"); }} className="rounded-xl px-4 py-3 text-left disabled:opacity-50" style={button}><strong className="block text-sm">미출제만 만들기</strong><span className="mt-1 block text-xs opacity-80">기존 시험문제 탭에 바로 추가</span></button>
          <button disabled={busy} onClick={() => { void createBatch("all"); }} className="rounded-xl border px-4 py-3 text-left disabled:opacity-50" style={{ borderColor: colors.border, backgroundColor: colors.bg }}><strong className="block text-sm">전체 새로 만들기</strong><span className="mt-1 block text-xs" style={{ color: colors.textMuted }}>새 탭에 준비 후 3단계에서 교체</span></button>
        </div>
        {busy && <p className="mb-3 text-sm" style={{ color: colors.textMuted }}>출제 자료를 생성하는 중…</p>}
        {batch && <><p className="mb-2 text-sm">{batch.mode === "all" ? "전체 재출제" : "미출제 노트"} · 대상 {batch.targetCount}개{batch.stagingName ? ` · ${batch.stagingName}` : ""}</p><p className="mb-2 truncate text-xs" style={{ color: colors.textMuted }}>묶음 {batch.batchId}</p><textarea readOnly value={batch.copyText} onFocus={(e) => e.currentTarget.select()} className="min-h-64 flex-1 resize-none rounded-xl p-3 font-mono text-xs" style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }} /><div className="mt-3 flex gap-2"><button onClick={copyAll} className="rounded-xl px-4 py-2" style={button}>전체 복사</button><button onClick={() => setStep(2)} className="rounded-xl border px-4 py-2" style={{ borderColor: colors.border }}>2단계로</button></div></>}
      </>}

      {step === 2 && <>
        {!batch ? <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: colors.bg }}>먼저 1단계에서 출제 자료를 만들어주세요.<div className="mt-3"><button onClick={() => setStep(1)} className="rounded-xl px-4 py-2" style={button}>1단계로</button></div></div> : <>
          <p className="mb-3 text-sm" style={{ color: colors.textMuted }}>AI가 만든 ZIP 파일을 넣으세요. 압축 안의 JSON을 파일 이름 순서대로 검사해 저장합니다.</p>
          <label onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void importFiles(Array.from(event.dataTransfer.files)); }} className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center" style={{ borderColor: colors.categorySelected, backgroundColor: colors.bg }}>
            <input type="file" accept=".zip,application/zip,.json,application/json" multiple className="sr-only" onChange={(event) => { void importFiles(Array.from(event.target.files || [])); event.currentTarget.value = ""; }} />
            <strong className="text-sm">ZIP 파일을 여기에 드래그</strong>
            <span className="mt-2 text-xs" style={{ color: colors.textMuted }}>또는 눌러서 선택 · ZIP 최대 15MB · 개별 JSON도 가능</span>
          </label>
          {fileReports.length > 0 && <FileReportList reports={fileReports} colors={colors} />}
          <details className="mt-3 text-xs" style={{ color: colors.textMuted }}><summary className="cursor-pointer">JSON 텍스트로 직접 입력</summary><textarea value={answer} onChange={(e) => { setAnswer(e.target.value); setResult(null); }} className="mt-2 min-h-36 w-full resize-y rounded-xl p-3 font-mono text-xs" style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }} placeholder="JSON 붙여넣기" /><button onClick={() => { void importAnswer(); }} disabled={busy || !answer.trim()} className="mt-2 rounded-xl px-4 py-2 disabled:opacity-50" style={button}>검사하고 추가</button></details>
        </>}
      </>}

      {step === 3 && <>
        {!batch ? <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: colors.bg }}>검토할 출제 묶음이 없습니다.<div className="mt-3"><button onClick={() => setStep(1)} className="rounded-xl px-4 py-2" style={button}>1단계로</button></div></div> : <>
          <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: colors.bg }}>
            <p className="font-medium">{batch.mode === "all" ? "전체 새 문제은행" : "미출제 문제 추가"}</p>
            <p className="mt-2" style={{ color: colors.textMuted }}>처리 {result?.resolvedCount ?? 0} / {result?.targetCount ?? batch.targetCount}개 · 남음 {result?.remainingCount ?? batch.targetCount}개</p>
            {result && <p className="mt-1" style={{ color: colors.textMuted }}>이번 입력 · 추가 {result.added} · 이미 추가됨 {result.duplicates} · 제외 {result.excluded || 0} · 보류 {result.held.length}</p>}
            {batch.mode === "all" && <p className="mt-1 text-xs" style={{ color: colors.textMuted }}>저장 위치: {result?.stagingName || batch.stagingName || "임시 문제은행 탭"}</p>}
          </div>
          {fileReports.length > 0 && <FileReportList reports={fileReports} colors={colors} />}
          {result?.held.map((item, index) => <p key={index} className="mt-2 text-xs" style={{ color: colors.textMuted }}>{item.id || `문항 ${index + 1}`}: {item.reason}</p>)}
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => { void refreshStatus(); }} disabled={busy} className="rounded-xl border px-4 py-2 disabled:opacity-50" style={{ borderColor: colors.border }}>상태 새로고침</button>
            {(result?.remainingCount ?? batch.targetCount) > 0 && <button onClick={() => setStep(2)} disabled={busy} className="rounded-xl border px-4 py-2 disabled:opacity-50" style={{ borderColor: colors.border }}>파일 더 넣기</button>}
            {batch.mode === "all" && result?.readyToApply && !result.applied && <button onClick={() => { void applyBatch(); }} disabled={busy} className="rounded-xl px-4 py-2 disabled:opacity-50" style={button}>새 문제은행 적용</button>}
          </div>
          {batch.mode === "uncovered" && result?.remainingCount === 0 && <p className="mt-3 text-sm">기존 시험문제 탭에 추가가 완료되었습니다.</p>}
          {batch.mode === "all" && result?.applied && <p className="mt-3 text-sm">새 문제은행을 적용했습니다.{result.previousSheet ? ` 이전 문제는 ${result.previousSheet} 탭에 보관했습니다.` : ""}</p>}
        </>}
      </>}
      {message && <p className="mt-3 text-sm" style={{ color: colors.textMuted }}>{message}</p>}
    </div>
  </>;
}

function FileReportList({ reports, colors }: { reports: FileReport[]; colors: ThemeColors }) {
  return <div className="mt-3 max-h-36 overflow-y-auto rounded-xl p-3 text-xs" style={{ backgroundColor: colors.bg }}>{reports.map((report) => <p key={report.name} className="mb-1"><span>{report.status === "saving" ? "처리 중" : report.status === "done" ? "완료" : "실패"}</span> · {report.name}{report.summary ? ` · ${report.summary}` : ""}</p>)}</div>;
}
