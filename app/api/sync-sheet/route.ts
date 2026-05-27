import { NextRequest, NextResponse } from "next/server";

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby8dYkRH1kUKiTfYvZ1jl2vZPR81GD2uhnU0oOPcP9gJKnGD3l0NrBtEuUdeVOfsg-b/exec";
const SECRET_KEY = "my-nikkaya-2024";

export async function POST(req: NextRequest) {
  try {
    const { id, text } = await req.json();
    if (!id || !text) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const params = new URLSearchParams({ key: SECRET_KEY, id, text });
    const res = await fetch(`${APPS_SCRIPT_URL}?${params.toString()}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
