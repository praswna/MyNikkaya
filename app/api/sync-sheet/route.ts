import { NextRequest, NextResponse } from "next/server";

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby8dYkRH1kUKiTfYvZ1jl2vZPR81GD2uhnU0oOPcP9gJKnGD3l0NrBtEuUdeVOfsg-b/exec";
const SECRET_KEY = "my-nikkaya-2024";

export async function POST(req: NextRequest) {
  try {
    const { id, text } = await req.json();
    console.log("sync-sheet 요청:", { id, text: text?.substring(0, 30) });

    if (!id || !text) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    // POST body로 전송 (URL 길이 제한 + 인코딩 문제 해결)
    const formData = new URLSearchParams();
    formData.append("key", SECRET_KEY);
    formData.append("id", id);
    formData.append("text", text);

    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
      redirect: "follow",
    });

    console.log("Apps Script 응답 status:", res.status);
    const rawText = await res.text();
    console.log("Apps Script 응답 body:", rawText.substring(0, 200));

    const data = JSON.parse(rawText);
    return NextResponse.json(data);
  } catch (err) {
    console.error("sync-sheet 오류:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
