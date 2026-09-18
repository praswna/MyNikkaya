# study-note 기능 통합 기록

- 기준: study-note `35e5e93` (2026-09-15 확인)
- 대상: MyNikkaya `8357a8e`

## 이식 범위

| 기능 | 구현 |
|---|---|
| 검색·정규화·결과 탐색 | SearchBar, lib/search.ts |
| 글 추가·삭제·카테고리 이동·이름 변경 | 새 관리 모달, app/page.tsx, sync-sheet API |
| 계층 카테고리·글 수·탐색·키보드 반복 이동 | lib/category.ts, app/page.tsx |
| 마크업 툴바·서식 제거·단축키 모드·되돌리기 | SourceEditor |
| 부분강조·루비 배치·서식 있는 각주·더블클릭 주석 | RubyText, lib/ruby.ts |
| 글별 수정 날짜·로딩 진행률 | CSV 로더, LoadingBar |
| 요소별 크기·사용자 프리셋 | SizeModal |
| 랜덤 배색·이력·저장 배색·본문 옆 색 조절 | ColorModal, SavedPalettes, ColorPins |
| 크기·색·AI 프롬프트 시트 동기화 | settings API, lib/settings-sync.ts |
| 시험·원문 보기·출제·JSON/ZIP 검토 및 적용 | QuizMode, QuizAdminModal, quiz API, lib/zip.ts |
| Apps Script 글/설정/문제 관리·백업·카테고리 탭 정리 | APPS_SCRIPT.gs |

## MyNikkaya 맞춤 통합

- 기존 경전 CSV, 링크, PWA 이름·아이콘, 수행 음원, 자동 CSV 갱신 워크플로 유지.
- 경전 맵을 새 글 목록 상태와 연결. 검색과 동일하게 카테고리 및 앞뒤 탐색을 맞춤.
- 수행 모달과 /bell 유지. 번역 프롬프트의 저장 키·내용을 유지하는 별도 모달 제공.
- 기존 기본 테마 값을 유지하면서 부분강조·상위 카테고리 색 역할 추가.
- 저장된 기존 테마·사용자 색을 읽고 새 배색 형식으로 이관. 초기 HTML 배경도 새 형식 지원.
- study-note에 고정된 시트 주소를 이식하지 않음. 모든 새 읽기 API는 MyNikkaya의 서버 환경변수 사용.
- 패키지 이름과 npm 잠금 파일 방식 유지.

## 적용과 검증

앱 코드와 별도로 MyNikkaya 시트의 Apps Script를 새 버전으로 배포해야 새 서버 기능이 활성화됩니다.
방법은 [SETUP.md](../SETUP.md)를 참고하세요. 실제 운영 시트 쓰기는 로컬 검증에서 실행하지 않았습니다.

- 자동 테스트: 기존 API/Apps Script/시험/검색/ZIP 34개 + 이식 회귀 테스트 4개
- 타입 검사, ESLint, Next.js 배포용 빌드
- 로컬 브라우저: 경전 표시, 대열반경 검색과 순번 연결, 긴 원문 입력·취소, 경전 맵, 통합 설정
