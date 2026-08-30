# MyNikkaya

불교 경전을 읽는 웹앱. 구글 시트에 담아 둔 경전을 한 편씩 꺼내 보고,
팔리어 루비와 주석을 얹어 읽고, 그 자리에서 고칠 수 있다.
수행 종(15분·30분·1시간)도 들어 있다.

- 사이트: https://my-nikkaya.vercel.app
- 스택: Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 (Vercel 배포)

## 개발

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # 배포 전 확인
npm run lint
```

명언 데이터는 `public/quotes_export.csv` 에 함께 실려 있어서, 환경변수 없이도
읽기는 그대로 된다. 시트에서 가져오기·시트에 저장하기만 설정이 필요하다.

## 환경변수

`.env.example` 을 `.env.local` 로 복사해 채운다. 배포에서는 Vercel 환경변수에 넣는다.

| 이름 | 쓰임 |
|---|---|
| `GOOGLE_SHEETS_URL` | 시트에서 명언 읽기 (`…/exec?format=csv`) |
| `APPS_SCRIPT_URL` | 시트에 저장하기 (`…/exec`) |
| `APPS_SCRIPT_KEY` | Apps Script 스크립트 속성 `SECRET_KEY` 와 같은 값 |
| `EDIT_PASSWORD` | 앱에서 본문을 고칠 때 물어보는 암호 |

뒤의 셋 중 하나라도 비어 있으면 저장 기능은 꺼진다. 설정하지 않은 곳에서
실수로 운영 시트를 고치지 않게 하기 위해서다.

**주소도 키도 코드에 적지 않는다.** 이 저장소는 공개다.

## 더 읽을 것

- `CLAUDE_GUIDE.md` — 마크업 문법, 구글 시트 구조, 작업 절차
- `APPS_SCRIPT.gs` — 시트 쪽 웹앱 (구글 Apps Script 에 붙여 넣는 코드)
