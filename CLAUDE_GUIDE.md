# 불교 경전 앱 작업 가이드 (for Claude)

## 프로젝트 개요
- **이름**: MyNikkaya (불교 경전 웹앱)
- **기술 스택**: Next.js 16 + React 19 + TypeScript + Tailwind CSS 4
- **배포**: Vercel (GitHub 연동 자동 배포)
- **저장소**: https://github.com/praswna/MyNikkaya

## 초기 설정

### 1. 저장소 clone
```bash
cd /home/claude
git clone https://github.com/praswna/MyNikkaya.git buddhist-quotes
cd buddhist-quotes
npm install
```

### 2. Git 인증 설정
사용자에게 GitHub Personal Access Token 요청 필요. 받으면:
```bash
git config user.email "claude@anthropic.com"
git config user.name "Claude"
git remote set-url origin https://[TOKEN]@github.com/praswna/MyNikkaya.git
```

## 프로젝트 구조

```
buddhist-quotes/
├── app/
│   ├── page.tsx              # 메인 화면 (명언 표시)
│   ├── layout.tsx            # 레이아웃, 메타데이터, PWA 설정
│   └── globals.css           # 전역 스타일
├── components/
│   ├── RubyText.tsx          # 명언 텍스트 + 루비/굵게/링크 렌더링
│   ├── DharmaWheel.tsx       # 법륜 SVG 컴포넌트
│   ├── SettingsModal.tsx     # 설정 팝업 (테마/글자크기/수행)
│   ├── MeditationModal.tsx   # 수행(명상) 종 화면
│   ├── SourceEditor.tsx      # 본문 자리에서 원문 고치기 (색칠 + 입력칸 겹치기)
│   ├── CanonMapModal.tsx     # 불교 경전 맵
│   ├── PromptModal.tsx       # 번역 프롬프트
│   ├── QRModal.tsx           # QR 코드 표시
│   └── EditPasswordModal.tsx # 시트 저장 암호 묻기
├── lib/
│   ├── types.ts              # Quote, RubySegment 타입
│   ├── ruby.ts               # 루비/굵게/링크 마크업 파서
│   ├── csv.ts                # CSV 파싱
│   ├── loader.ts             # 명언 데이터 로더 (localStorage + Google Sheets)
│   ├── theme.ts              # 다크/라이트 테마 색상
│   ├── settings.ts           # 테마·크기 설정 (localStorage, useSyncExternalStore)
│   ├── edit-key.ts           # 편집 암호 보관 (localStorage)
│   ├── edit-position.ts      # 읽기↔수정 전환 때 위치 맞추기
│   ├── read-position.ts      # 명언마다 읽던 자리 기억
│   ├── use-bell.ts           # 수행 종 재생 (설정 팝업과 /bell 이 함께 쓴다)
│   ├── use-escape.ts         # 팝업을 Esc 로 닫기
│   ├── canon.ts              # 삼장 구조 + 경 번호 파싱
│   └── text-size.ts          # 텍스트 길이별 폰트 크기
├── public/
│   ├── quotes_export.csv     # 명언 데이터 (Google Sheets 자동 동기화)
│   ├── links.json            # 참고 사이트 링크
│   ├── bell.m4a              # 종소리 원본
│   ├── bell_15m.mp3          # 15분 수행 (종+무음+종)
│   ├── bell_30m.mp3          # 30분 수행
│   ├── bell_1h.mp3           # 1시간 수행
│   ├── icon.svg, icon-*.png  # 앱 아이콘 (법륜)
│   └── manifest.json         # PWA 설정
└── .github/workflows/
    └── sync-csv.yml          # 매일 Google Sheets → CSV 자동 동기화 (검사 통과분만 커밋)
```

## 마크업 문법

명언 텍스트(CSV의 text 컬럼)에서 사용하는 문법:

### 루비 텍스트 (윗첨자)
```
불선법{不善法,unwholesome,해로운법}
```
→ `불선법` 위에 `不善法 / unwholesome / 해로운법` 표시

### 루비 주석 (클릭 팝업)
```
불선법{不善法,unwholesome^1}

--주석--
^1 탐·진·치에 뿌리를 둔 해로운 법.
```
→ `^` 뒤는 **각주 번호**, 실제 주석은 글 맨 끝 `--주석--` 블록에 모아 둔다
   (주석이 길어져도 본문 흐름이 끊기지 않는다)
→ 번호는 앱이 자동으로 매기고 다시 매긴다 — 손으로 적을 일이 없다
→ 주석이 있는 단어는 점선 밑줄로 표시되고, 클릭하면 팝업으로 주석이 뜸
→ 주석 안에서 엔터(Alt+Enter)로 줄바꿈 가능, `{` `}` 도 쓸 수 있다
→ 블록 안에서 `^숫자`로 시작하는 줄은 주석의 경계이므로, 주석 본문에 그런 줄이
   있으면 저장할 때 앞에 공백을 하나 넣어 비켜 놓는다

**옛 형식도 그대로 읽는다**
```
불선법{不善法,unwholesome^탐·진·치에 뿌리를 둔 해로운 법.}
```
→ 중괄호 안에 주석이 그대로 든 옛 글도 읽기·팝업 모두 정상 동작하고,
   그 명언의 주석을 한 번이라도 저장하면 각주 블록으로 자동 이관된다

**메인 화면에서 바로 추가/수정**
- 루비가 달린 단어를 누르면 팝업이 뜬다
- 주석이 없는 단어 → 바로 입력창, 주석이 있는 단어 → 주석 표시 후 `주석 수정` 버튼
- 저장하면 원문의 `{...}` 안에 `^주석`이 삽입되고, 수정 화면 저장과 같은 경로
  (localStorage + `/api/sync-sheet`)로 시트까지 동기화된다

### 굵게 + 강조색
```
[[제목]]
```
→ 굵게 + textBold 색상 (다크: #E5C88A, 라이트: #8B6914)

### 굵게 + 루비
```
[[대인연경{大因緣經,Mahānidāna Sutta}]]
```
→ 베이스 굵게, 루비는 평소 색

### 자동 링크
```
https://sc.readingfaithfully.org/?q=MN18
```
→ 작은 하이퍼링크 (40% 크기)

### 줄바꿈
CSV 셀 안에서 그냥 엔터 (Alt+Enter) → 화면에서도 줄바꿈

## 테마 색상

`lib/theme.ts`에 다크/라이트 테마 정의:
- **다크**: 따뜻한 어두운 갈색 (#2E2B28) 배경
- **라이트**: 베이지 (#E5DED4) 배경
- 카테고리 선택 색: 황금색 텍스트
- 루비 베이스 강조색: textEmphasis

## 핵심 기능

1. **명언 표시**: 로컬 CSV → 카테고리 필터 → 랜덤 표시
2. **루비/굵게/링크 렌더링**: RubyText 컴포넌트 (루비 클릭 → 주석 팝업 + 주석 추가/수정)
3. **본문 수정**: 본문 오른쪽 위 연필 버튼 → 화면 이동 없이 그 자리에서 원문(마크업) 수정
   - ✓ 저장 / ✕ 취소, 설정의 `내용 수정`도 같은 동작
   - 수정 중 새 명언·카테고리·동기화를 누르면 고친 내용은 자동 저장된다
4. **수행(명상) 타이머**: 15/30/1시간 통짜 mp3 재생 (백그라운드 안정)
   - 재생 로직은 `lib/use-bell.ts` 한 곳에 있다 (설정 팝업과 `/bell` 페이지가 같이 쓴다)
   - 소리가 막히거나 끝내 안 받아지면(30초) 안내와 `다시 시작` 버튼이 뜬다
5. **테마 전환**: 다크/라이트, localStorage 저장
6. **크기 조절** (설정 > 크기 조절, 한 창에 슬라이더 두 개, localStorage 저장)
   - **글자 크기**: 70~250%
   - **가로 크기**: 화면이 넓은 PC 에서 카테고리·본문·버튼이 양옆으로 퍼지지 않게
     화면 전체를 가운데 기둥으로 좁힌다 (기본 720px, 맨 오른쪽은 제한 없음)
   - 두 슬라이더 모두 움직이는 즉시 화면에 반영된다
7. **Google Sheets 동기화**: 매일 자동 + 수동 동기화 버튼
8. **읽던 자리 기억**: 긴 경을 보다 나가도 다음에 그 자리에서 이어 읽는다
   (본문으로 이름표를 만들어 최근 30개, `lib/read-position.ts`)

## 명언 데이터가 흐르는 길

```
구글 시트 ──매일──> public/quotes_export.csv ──처음 열 때──> 화면
    └──동기화 버튼──> /api/quotes ──> localStorage(quotes_cache) ──> 화면
```

CSV 는 `category,text,id` 세 칸이다. 앱은 id 를 `sheetId` 로 들고 있다가
저장할 때 되돌려 보낸다.

저장소 CSV 는 **조건부 요청**으로 받는다. 주소에 시각(`?t=`)을 붙이거나
`no-store` 를 쓰면 300KB 를 매번 새로 받게 된다. 그냥 두면 브라우저가
바뀌었는지만 묻고(ETag) 그대로면 300바이트로 끝난다.

- 캐시가 있으면 그것으로 먼저 띄우고, **저장소 CSV 와 명언 개수가 다르면**
  (=늘거나 줄었다) 뒤에서 갈아끼운다. 개수가 같으면 건드리지 않으므로
  내가 고친 본문이 되돌아가지 않는다.
- 본문을 고치면 메모리·경전 맵·캐시를 한 번에 맞추고 시트로 보낸다.
  찾는 기준은 시트에 쓸 때와 같은 **본문 전체 일치**다.

## 구글 시트 (여러 탭)

명언 탭은 **이름이 아니라 머리글로 가린다.** 1행이 `category | text` 인 탭이면
이름이 무엇이든 읽기·쓰기에 모두 포함된다. 탭을 늘려도 앱 코드는 손대지 않는다.

- 계산용·메모용처럼 형식이 다른 탭은 저절로 빠진다
- 잠깐 빼두려면 그 탭의 머리글을 `_category` 처럼 바꿔 놓으면 된다
- 새 탭에는 1행에 `category | text` 머리글을 꼭 넣는다 (없으면 첫 줄이 사라진다)

### 설정값은 전부 환경변수에 둔다

**주소도 키도 코드에 적지 않는다.** 이 저장소는 공개라, 코드에 적으면 그대로
새어 나가고 누구나 시트를 고칠 수 있게 된다. 견본은 `.env.example` 에 있다.

| 곳 | 이름 | 쓰임 |
|---|---|---|
| GitHub 저장소 시크릿 | `GOOGLE_SHEETS_URL` | 매일 `public/quotes_export.csv` 갱신 |
| Vercel 환경변수 | `GOOGLE_SHEETS_URL` | 읽기 — 동기화 버튼 (`/api/quotes` 가 읽는다) |
| Vercel 환경변수 | `APPS_SCRIPT_URL` | 쓰기 — 같은 배포 주소에서 `?format=csv` 만 뺀 것 |
| Vercel 환경변수 | `APPS_SCRIPT_KEY` | 쓰기 — Apps Script 스크립트 속성 `SECRET_KEY` 와 같은 값 |
| Vercel 환경변수 | `EDIT_PASSWORD` | 앱에서 본문을 고칠 때 물어보는 암호 |
| Apps Script 스크립트 속성 | `SECRET_KEY` | 웹앱이 쓰기 요청을 확인하는 키 |

읽기 URL 은 Apps Script 웹앱의 `…/exec?format=csv`, 쓰기 URL 은 같은 배포의 `…/exec` 다.

**`NEXT_PUBLIC_` 접두어를 붙이지 않는다.** 붙이면 그 값이 브라우저 번들에 그대로
박힌다. 동기화 버튼은 시트를 직접 부르지 않고 `app/api/quotes/route.ts` 를 거치며,
시트 주소는 서버만 안다. (덤으로 브라우저 → Apps Script 직접 호출이 아니라서
CORS 문제도 없다.) 환경변수를 바꾼 뒤에는 재배포해야 적용된다.

`APPS_SCRIPT_URL` · `APPS_SCRIPT_KEY` · `EDIT_PASSWORD` 중 하나라도 비어 있으면
**저장 기능은 통째로 꺼진다.** 설정하지 않은 곳(로컬 개발 등)에서 실수로 운영
시트를 고치지 않게 하기 위해서다.

### 편집 암호

`/api/sync-sheet` 는 앱만 부르는 창구가 아니다. 주소를 아는 사람은 누구나 부를 수
있으므로, 서버가 요청 본문의 `password` 를 `EDIT_PASSWORD` 와 대조한다.
(헤더가 아니라 본문에 담는다 — HTTP 헤더는 라틴-1 이라 한글 암호가 실리지 않는다.)

- 처음 저장할 때 앱이 암호를 한 번 묻고, 그 기기의 localStorage(`edit_password`)에 담아 둔다
- 암호를 넣지 않으면 고친 내용은 그 기기에만 남고 시트에는 가지 않는다 (화면에 알려준다)
- 암호를 바꾸면 각 기기에서 다시 한 번 묻는다

### id 열 (C열) — 손으로 적을 일이 없다

명언마다 붙어 다니는 이름표다. **빈 칸은 앱이 시트를 읽을 때 저절로 채워진다.**
새 명언을 넣을 때는 `category` · `text` 두 칸만 쓰면 된다.

- 저장할 때 이 이름표로 행을 찾는다 → 본문을 통째로 보내지 않아도 된다
  (긴 경은 보내는 양이 절반으로 줄고, 시트도 C열만 훑으면 된다)
- 본문이 완전히 똑같은 명언이 둘 있어도 각자 제 행에 저장된다
- 시트에서 행을 정렬하거나 옮겨도 이름표가 따라다닌다
- 행을 복사해 붙여 이름표가 겹치면, 다음 읽기 때 뒤엣것에 새로 매겨진다

탭을 가려내는 기준은 여전히 1행의 `category | text` 라, C열이 있든 없든 상관없다.

아직 이름표를 모르는 앱(옛 캐시, id 열이 없는 CSV)은 예전처럼 **본문 전체가
일치하는 행**을 찾는 길로 저장한다. 그 길에서는 똑같은 본문이 둘이면 앞 탭에 저장된다.
(화면에서 쓰는 `gs-1`… 은 CSV 를 읽을 때마다 새로 매겨지는 값이라 행을 특정하는
데 쓸 수 없다. 시트의 이름표와는 다른 것이다.)

Apps Script 를 고친 뒤에는 **[배포 관리 → 편집(연필) → 버전: 새 버전 → 배포]**
로 올린다. 이렇게 하면 **URL 이 그대로**라 환경변수를 손댈 일이 없다.
반대로 [새 배포] 를 만들면 URL 이 바뀌고, 그러면 `GOOGLE_SHEETS_URL`(GitHub 시크릿·
Vercel)과 `APPS_SCRIPT_URL`(Vercel)도 같이 고쳐야 한다.

### 키를 바꿔야 할 때

1. Apps Script → [프로젝트 설정 → 스크립트 속성] 의 `SECRET_KEY` 를 새 값으로
2. [배포 관리] 에서 **새 버전으로 배포** (URL 이 바뀐다)
3. 옛 배포는 **보관 처리** — 살려 두면 옛 주소로 계속 들어올 수 있다
4. Vercel 의 `GOOGLE_SHEETS_URL` · `APPS_SCRIPT_URL` · `APPS_SCRIPT_KEY` 와
   GitHub 시크릿 `GOOGLE_SHEETS_URL` 을 새 값으로 고치고 재배포

## 작업 패턴

### 코드 수정 → 푸시 절차
```bash
cd /home/claude/buddhist-quotes
# 코드 수정 (Edit 도구 또는 cat > 사용)
npm run build 2>&1 | tail -5  # 빌드 확인
git add .
git commit -m "변경 내용 설명"
git push origin main
```

### 충돌 발생 시 (CSV 자동 동기화 때문)
```bash
git pull --rebase origin main
git push origin main
```

## 주의사항

1. **항상 빌드 테스트** 먼저: `npm run build`
2. **푸시 전에 충돌 확인**: 매일 자동 CSV 동기화가 실행됨
3. **사용자가 "시작"이라고 말하기 전에는 작업 시작하지 말 것**
4. **iOS PWA 제약**: 
   - 상태바 색상 제한적 (default/black/black-translucent만)
   - 백그라운드 오디오 제한 → 통짜 mp3로 해결
5. **긴 경 수정**: 대열반경은 4만 자에 색칠 조각이 2,500개다. 글자 하나에 화면
   전체를 다시 그리면 타자가 밀린다. 그래서 (1) 고치는 중인 글은 `SourceEditor`
   안에만 두고 (2) 색칠은 줄 단위로 memo 를 걸며 (3) 높이는 뒤에 깔린 글이 정한다
   (재지 않는다). 이 구조를 건드릴 때는 긴 경으로 타자 속도를 꼭 재 볼 것
6. **루비 줄바꿈**: 크롬은 `<rt>` 안의 줄바꿈(`\n` + `pre-line`, `<br>`, 블록 자식)을 전부
   무시하고 한 줄로 붙인다. 조각마다 `<span>`을 만들고 `display:inline-flex` + `flex-direction:column`
   상자로 감싸야 크롬에서도 줄이 나뉜다 (사파리는 두 방식 다 잘 나뉨)

## 작업 스타일

- 사용자가 "ㄱㄱ" / "시작" 이라고 말하면 시작
- 짧고 명확하게 응답
- 큰 변경 전에 항상 확인 받기
- 푸시 후 "Vercel 배포 확인해보세요!" 안내
