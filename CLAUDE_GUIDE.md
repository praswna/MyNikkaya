# 불교 경전 앱 작업 가이드 (for Claude)

## 프로젝트 개요
- **이름**: MyNikkaya (불교 경전 웹앱)
- **기술 스택**: Next.js 15 + TypeScript + Tailwind CSS
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
│   ├── SplashScreen.tsx      # 앱 시작 스플래시
│   ├── SettingsModal.tsx     # 설정 팝업 (테마/글자크기/수행)
│   ├── MeditationModal.tsx   # 수행(명상) 종 타이머
│   └── QRModal.tsx           # QR 코드 표시
├── lib/
│   ├── types.ts              # Quote, RubySegment 타입
│   ├── ruby.ts               # 루비/굵게/링크 마크업 파서
│   ├── csv.ts                # CSV 파싱
│   ├── loader.ts             # 명언 데이터 로더 (localStorage + Google Sheets)
│   ├── theme.ts              # 다크/라이트 테마 색상
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
    ├── deploy.yml            # Vercel 자동 배포 (불필요할 수도)
    └── sync-csv.yml          # 매일 Google Sheets → CSV 자동 동기화
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
5. **테마 전환**: 다크/라이트, localStorage 저장
6. **크기 조절** (설정 > 크기 조절, 한 창에 슬라이더 두 개, localStorage 저장)
   - **글자 크기**: 70~250%
   - **가로 크기**: 화면이 넓은 PC 에서 카테고리·본문·버튼이 양옆으로 퍼지지 않게
     화면 전체를 가운데 기둥으로 좁힌다 (기본 720px, 맨 오른쪽은 제한 없음)
   - 두 슬라이더 모두 움직이는 즉시 화면에 반영된다
7. **Google Sheets 동기화**: 매일 자동 + 수동 동기화 버튼

## 구글 시트 (여러 탭)

명언 탭은 **이름이 아니라 머리글로 가린다.** 1행이 `category | text` 인 탭이면
이름이 무엇이든 읽기·쓰기에 모두 포함된다. 탭을 늘려도 앱 코드는 손대지 않는다.

- 계산용·메모용처럼 형식이 다른 탭은 저절로 빠진다
- 잠깐 빼두려면 그 탭의 머리글을 `_category` 처럼 바꿔 놓으면 된다
- 새 탭에는 1행에 `category | text` 머리글을 꼭 넣는다 (없으면 첫 줄이 사라진다)

읽기 URL 은 Apps Script 웹앱의 `…/exec?format=csv` 이고, 두 곳에 넣는다.

| 곳 | 이름 | 쓰임 |
|---|---|---|
| GitHub 저장소 시크릿 | `GOOGLE_SHEETS_URL` | 매일 `public/quotes_export.csv` 갱신 |
| Vercel 환경변수 | `NEXT_PUBLIC_GOOGLE_SHEETS_URL` | 앱의 동기화 버튼 |

저장은 **본문 전체가 일치하는 행**을 찾아 B열을 덮어쓴다. 그래서 두 탭에
완전히 똑같은 본문이 있으면 앞 탭에 저장된다. (id `gs-1`… 은 CSV 를 읽을 때마다
새로 매겨지는 값이라 행을 특정하는 데 쓸 수 없다.)

Apps Script 를 고친 뒤에는 **[배포 관리 → 편집(연필) → 버전: 새 버전 → 배포]**
로 올린다. 새 배포를 만들면 URL 이 바뀌고, 그러면 `app/api/sync-sheet/route.ts` 의
`APPS_SCRIPT_URL` 과 위 두 환경변수도 같이 고쳐야 한다.

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
5. **루비 줄바꿈**: 크롬은 `<rt>` 안의 줄바꿈(`\n` + `pre-line`, `<br>`, 블록 자식)을 전부
   무시하고 한 줄로 붙인다. 조각마다 `<span>`을 만들고 `display:inline-flex` + `flex-direction:column`
   상자로 감싸야 크롬에서도 줄이 나뉜다 (사파리는 두 방식 다 잘 나뉨)

## 작업 스타일

- 사용자가 "ㄱㄱ" / "시작" 이라고 말하면 시작
- 짧고 명확하게 응답
- 큰 변경 전에 항상 확인 받기
- 푸시 후 "Vercel 배포 확인해보세요!" 안내
