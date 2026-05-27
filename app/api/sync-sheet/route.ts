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

    const params = new URLSearchParams({ key: SECRET_KEY, id, text });
    const url = `${APPS_SCRIPT_URL}?${params.toString()}`;
    console.log("Apps Script 요청 URL:", url.substring(0, 100));

    const res = await fetch(url, { redirect: "follow" });
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
