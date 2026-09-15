# 시험문제 수동 생성 자동화 인수인계

## 현재 작업 위치

- 브랜치: `plan/manual-quiz-automation`
- 기준 계획: `docs/manual-quiz-automation-plan.md`
- 1차 구현 커밋은 `71d1e35`이며, 이후 보완 작업은 다음 커밋에 이어진다.
- `APPS_SCRIPT.gs`를 운영 Apps Script에 새 버전으로 배포해야 실제 시트 작업이 동작한다.

## 이번에 구현한 범위

앱 설정에 **시험문제 출제** 진입 버튼과 `QuizAdminModal`을 추가했다. 상단의 세 단계 버튼으로 어느 단계든 직접 이동한다. STEP 1에서 전체 노트 탭의 대상 노트, 기존 문제 요약, ZIP으로 묶는 다중 JSON 응답 계약을 생성한다. STEP 2에서 ZIP을 그대로 받아 내부 JSON을 이름 순서로 풀어서 검사한다. STEP 3에서는 처리·남은 노트와 파일별 결과를 확인하고 전체 재출제 문제은행을 적용한다.

Next.js의 `/api/quiz-admin`은 브라우저에서 받은 편집 암호를 검증하고 `APPS_SCRIPT_KEY`를 브라우저에 노출하지 않은 채 Apps Script의 묶음 생성, 파일 입력, 상태 조회, 문제은행 적용 작업으로 전달한다. 답변 크기는 1.5MB로 제한한다.

Apps Script는 다음을 구현한다.

- 모든 `category | text` 탭을 훑고 빈 노트 ID만 생성
- 중복 노트 ID는 자동 변경하지 않고 이번 대상에서 제외
- 기존 문제의 `source_ids`에 연결된 노트를 출제 완료로 판별
- `시험문제_출제이력` 탭에 묶음 ID, 시각, 원본 위치·본문 해시 저장
- 묶음 ID, ID 접두어, 원본 변경, 카테고리, 필수 필드, 오답 4개, 날짜를 검사
- 같은 문제 ID/같은 내용은 재추가하지 않고, 같은 ID/다른 내용은 보류
- 미출제 문제 추가 전 묶음당 한 번 운영 문제 탭을 복제 백업
- `=`로 시작하는 셀 값을 수식으로 실행하지 않고 문자열로 저장
- 명시적인 제외 사유를 `시험문제_출제제외`에 기록하고 원본이 그대로일 때 다음 묶음에서 제외
- 동일 ID·동일 내용 재시도와 응답 내부 중복을 구분
- 긴 묶음 이력을 4만 자 단위로 나누어 저장
- 브라우저 새로고침 뒤 현재 단계·복사 자료·AI 입력 복원
- ZIP 또는 다중 JSON 파일 드롭 시 압축 해제·순차 검사·추가 및 잘못 저장된 암호 재입력
- 묶음 생성과 전체 문제은행 적용은 브라우저 기본 확인창 없이 즉시 실행하고 관련 안내는 모달 안에 표시
- STEP 1에서 **미출제만 만들기**와 **전체 새로 만들기** 선택
- 전체 재출제 결과를 새 임시 탭에 저장하고 모든 대상 노트 처리 전에는 적용 차단
- STEP 3 적용 시 기존 운영 탭을 이전 탭으로 보관하고 임시 탭을 새 `시험문제` 탭으로 전환

## 검증 결과

- TypeScript: `tsc --noEmit` 통과
- 테스트: ZIP 압축 해제와 Apps Script·API 시나리오를 포함해 24개 통과
- TypeScript와 ESLint 통과
- Next.js 프로덕션 빌드 통과
- `git diff --check` 통과

이 환경에서는 일반 `npm`이 PATH에 없었다. 아래 번들 런타임으로 실행할 수 있다.

```powershell
$node = 'C:\Users\DongWook\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $node node_modules/typescript/bin/tsc --noEmit
& $node node_modules/eslint/bin/eslint.js .
& $node --test tests/*.test.mjs
```

## 다음 작업 순서

1. 실제 Google Sheets 복제본에 `APPS_SCRIPT.gs`를 배포하고 STEP 1 → 외부 AI → STEP 2 → STEP 3 전체 흐름을 브라우저에서 확인한다.
2. Apps Script 통신이 문제 저장 직후 끊긴 경우 재시도로 중복을 찾는 동작을 실제 환경에서 확인한다.
3. `results`의 `unprocessed`는 의도대로 아무 기록도 만들지 않는다. 운영상 미처리 이력 조회가 필요하면 별도 화면을 추가한다.
4. 운영 문제 탭은 최초에 후보가 하나이거나 정확히 `시험문제`라는 탭이 하나면 실제 시트 ID를 스크립트 속성에 등록한다. 이름까지 같은 후보가 여러 개인 특수 상황을 위한 선택 UI는 아직 없다.
5. `시험문제_출제제외`의 `active`를 앱에서 해제하는 관리 UI는 아직 없다. 지금은 시트에서 값을 `FALSE`로 바꾸면 다시 출제 대상이 된다.
6. 사용자 정의 출제 지침과 저장소의 `docs/quiz-generation-prompt.md` 전체를 STEP 1 계약과 병합하는 작업이 남아 있다. 현재는 Apps Script 안의 필수 안전·JSON 지침을 사용한다.
7. 성공 후 문제 읽기 API는 항상 `no-store`라 새 문제가 바로 보이지만, 실제 앱에서 우클릭하여 확인하는 브라우저 시나리오를 추가한다.

## 주의할 코드 지점

- `APPS_SCRIPT.gs`의 `fillIds()`는 이제 빈 ID만 채우고 기존 중복 ID는 바꾸지 않는다. 출제 자료 생성 시 전체 탭 중복을 찾아 대상에서 보류한다.
- 운영 시트에서 Apps Script를 아직 갱신하지 않은 상태라면 앱의 새 API는 `Unknown action` 오류를 받는다.
- UI는 기존 `loadEditPassword()` 저장값을 재사용한다. 잘못 저장된 암호를 지우고 재입력하는 UX는 기존 편집 흐름과 함께 확인한다.
