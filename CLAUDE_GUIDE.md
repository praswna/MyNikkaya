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
불선법{不善法,unwholesome^탐·진·치에 뿌리를 둔 해로운 법.}
```
→ `^` 앞은 루비(위첨자), 뒤는 주석 본문
→ 주석이 있는 단어는 점선 밑줄로 표시되고, 클릭하면 팝업으로 주석이 뜸
→ 주석 안에서 엔터(Alt+Enter)로 줄바꿈 가능 / `{` `}` 문자는 사용 불가 (저장 시 자동 제거)

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
3. **수행(명상) 타이머**: 15/30/1시간 통짜 mp3 재생 (백그라운드 안정)
4. **테마 전환**: 다크/라이트, localStorage 저장
5. **글자 크기 조절**: 슬라이더, localStorage 저장
6. **Google Sheets 동기화**: 매일 자동 + 수동 동기화 버튼

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
5. **루비 줄바꿈**: `whiteSpace: "pre-line"` + `\n` 사용 (크롬 호환성)

## 작업 스타일

- 사용자가 "ㄱㄱ" / "시작" 이라고 말하면 시작
- 짧고 명확하게 응답
- 큰 변경 전에 항상 확인 받기
- 푸시 후 "Vercel 배포 확인해보세요!" 안내
