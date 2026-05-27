import { NextRequest, NextResponse } from "next/server";

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby8dYkRH1kUKiTfYvZ1jl2vZPR81GD2uhnU0oOPcP9gJKnGD3l0NrBtEuUdeVOfsg-b/exec";
const SECRET_KEY = "my-nikkaya-2024";

export async function POST(req: NextRequest) {
  try {
    const { oldText, newText } = await req.json();
    console.log("sync-sheet 요청:", { oldText: oldText?.substring(0, 30), newText: newText?.substring(0, 30) });

    if (!oldText || !newText) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const formData = new URLSearchParams();
    formData.append("key", SECRET_KEY);
    formData.append("oldText", oldText);
    formData.append("newText", newText);

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
