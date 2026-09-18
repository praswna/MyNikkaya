# MyNikkaya — 시트 연결 및 기능 업데이트

## 기존 설치

MyNikkaya 시트에서 확장 프로그램 → Apps Script를 열고 `APPS_SCRIPT.gs` 전체를 반영합니다.
배포 관리 → 편집 → 새 버전 → 배포를 선택하면 URL과 기존 환경변수를 유지할 수 있습니다.
새 기능에 `Unknown action` 오류가 나오면 Apps Script 배포 버전을 확인하세요.

## 새 설치

1. 구글 시트에 `category | text` 머리글을 둡니다. `id`, `updated` 열은 스크립트가 관리합니다.
2. Apps Script에 `APPS_SCRIPT.gs`를 붙여 넣고 스크립트 속성 `SECRET_KEY`를 설정합니다.
3. 웹 앱으로 배포합니다. 실행 계정은 본인, 액세스는 전체로 설정합니다.
4. Vercel에 아래 환경변수를 등록하고 재배포합니다. `NEXT_PUBLIC_` 접두어는 사용하지 않습니다.

| 이름 | 값 |
|---|---|
| `GOOGLE_SHEETS_URL` | MyNikkaya 웹 앱 주소 `…/exec?format=csv` |
| `APPS_SCRIPT_URL` | 동일한 웹 앱 주소 `…/exec` |
| `APPS_SCRIPT_KEY` | Apps Script의 `SECRET_KEY` |
| `EDIT_PASSWORD` | 앱에서 편집할 때 입력할 암호 |

쓰기 변수 3개 중 하나라도 없으면 시트 저장이 비활성화됩니다. 환경변수 없이도 저장소의 경전 CSV로 읽을 수 있습니다.
읽기 주소는 서버 환경변수에서 가져옵니다. study-note의 주소를 복사하지 마세요.
GitHub의 매일 CSV 자동 갱신은 저장소 시크릿 `GOOGLE_SHEETS_URL`을 사용합니다.

## 시험문제

시험 기능을 쓰려면 `시험문제` 탭을 만들고 1행에 아래 머리글을 정확히 넣는다.

`id | category | source_ids | question | correct_answer | distractors | explanation | created`

- `id`: 문제마다 겹치지 않는 값
- `category`: 우클릭할 카테고리 이름
- `source_ids`: 근거 카드 ID의 JSON 배열(예: `["card-1"]`)
- `question`, `correct_answer`, `explanation`: 문제·정답·해설
- `distractors`: 서로 다른 오답 후보를 최소 3개, 권장 6~8개 넣은 JSON 배열
- `created`: 작성일 또는 빈칸

예: `q-001 | 한국사 | ["card-1"] | 조선을 건국한 인물은? | 이성계 | ["이방원","왕건","궁예","견훤","세종","정도전"] | 조선은 이성계가 건국했다. | 2026-09-09`

앱의 **설정 → 시험문제 출제**를 사용하면 위 8개 열을 직접 입력하지 않아도 된다.
처음 출제 자료를 만들 때 Apps Script가 `시험문제_출제이력` 탭을 만들고, AI가 명시적으로 제외한
노트가 있으면 `시험문제_출제제외` 탭도 만든다. 문제를 추가할 때마다 `시험문제_백업_날짜_시각_*`
탭이 생기며 자동 삭제하지 않는다. 이 관리·백업 탭의 이름과 머리글은 바꾸지 않는다.


## 시트 구조와 설정

새 글은 카테고리와 짝이 되는 자료 탭에 들어갑니다. 하위 카테고리는 상위 카테고리 탭을 사용하며,
카테고리 이동 시 ID와 나머지 열을 유지해 행을 옮깁니다. 시트 메뉴의 정리 기능으로 기존 행도 정리할 수 있습니다.
설정 탭은 배색·크기 프리셋·AI 프롬프트를 보관합니다. 크기와 색 적용은 해당 창에서 직접 선택합니다.
번역 프롬프트는 기존 브라우저 저장값을 유지하며 AI 프롬프트와 별도로 제공합니다.
