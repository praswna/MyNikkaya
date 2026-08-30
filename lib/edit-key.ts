// 본문을 고쳐 시트에 저장할 때 쓰는 암호.
//
// 앱을 거치지 않고 /api/sync-sheet 로 바로 쏘는 것을 막기 위한 관문이라,
// 서버(EDIT_PASSWORD 환경변수)와 대조된다. 한 번 넣으면 이 기기에 남는다.

const STORAGE_KEY = "edit_password";

export function loadEditPassword(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveEditPassword(password: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, password);
  } catch {}
}
