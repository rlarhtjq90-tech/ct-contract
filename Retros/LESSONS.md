# 교훈 기록 (Lessons Learned)

코딩 및 전략 교훈. /wrap 세션에서 기록됩니다.
#coding 태그 항목은 SessionStart 시 자동 주입됩니다.
반복 패턴은 /wrap HITL 승급을 통해 적절한 vehicle로 적용됩니다.

## UI / 입력 패턴

### 숫자 입력 콤마 포맷은 focusedId 분기 없이 가능 #coding #ux
`focusedId` 상태로 포커스 여부에 따라 raw/formatted 전환하면 깜빡임이 생기고 코드가 복잡해진다.
`onChange`에서 `value.replace(/,/g, "")` 파싱 후 상태에 저장하고, `value={fmtNum(editedAmt)}`로 항상 포맷된 값을 표시하면 동일한 UX를 절반의 코드로 달성할 수 있다.

### 기성 확정 UX는 저장+승인 원자 처리로 단순화 #coding #ux
"저장 → 승인" 2단계는 결재 플로우처럼 느껴져 혼란을 줄 수 있다. 단일 "확정" 버튼에서 `bulkUpdate` + `approve`를 직렬 호출하면 원자적으로 처리되고, `approve()`는 멱등성이 있으므로 재확정(수정 후 재확정)도 안전하다. 재편집은 클라이언트 `editingRows Set`만으로 제어하면 서버 상태 변경 없이 가능.

## Deployment / 서버리스

### NestJS 서버리스 콜드 스타트는 health 엔드포인트 + UptimeRobot으로 방지 #coding #deployment
NestJS는 DI 컨테이너 초기화 + DB 연결로 콜드 스타트가 2~5초 걸린다. `/api/health`에서 `SELECT 1` 쿼리까지 실행하는 엔드포인트를 만들고, UptimeRobot(무료) 5분 인터벌로 ping하면 비용 없이 서버·DB를 항상 워밍업 상태로 유지할 수 있다.

### 수치 비교 UI는 차트보다 테이블+인라인 바 조합이 실무 가독성 높음 #coding #ux
여러 항목의 금액·비율을 비교할 때 불릿 차트(오버레이 바)보다 테이블 행에 숫자 컬럼 + 얇은 인라인 progress bar를 넣는 방식이 정렬·스캔이 쉬워 실무 사용자에게 더 직관적이다.

## NestJS

### ValidationPipe forbidNonWhitelisted 사용 시 DTO 데코레이터 필수 #coding #nestjs
`ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`를 설정하면
DTO 클래스의 **모든** 필드에 `@IsString()`, `@IsNumber()` 등 class-validator 데코레이터가 있어야 한다.
데코레이터가 없으면 "property X should not exist" 400 에러로 전체 요청이 거부된다.

### dist 업데이트 후 수동 재시작 확인 필수 #coding #nestjs
`nest start --watch`가 실행 중이어도 포트에 실제로 바인딩된 PID가 새 dist를 사용하는지 보장되지 않는다.
파일 수정 후 `Get-NetTCPConnection -LocalPort 4000` → PID 확인 → `Stop-Process` 후 재시작 패턴이 확실함.

## DB 필드 관리

### 컬럼 제거 시 grep으로 8곳 범위 파악 후 일괄 수정 #coding #nestjs
DB 컬럼 하나를 제거할 때 entity/DTO/service/contract-changes/reports/snapshots/seed/UI 최소 8군데를 수정해야 한다. `grep -r "fieldName" --include="*.ts" --include="*.tsx"` 로 범위를 먼저 파악하고, 백엔드·프론트엔드 전체를 한 번에 수정해야 타입 에러와 런타임 불일치를 방지할 수 있다.

### seed dedup 키는 제거 가능한 코드 컬럼 대신 비즈니스 유니크 조합 사용 #coding #nestjs
contractNo·projectCode처럼 삭제될 수 있는 코드 컬럼을 seed의 중복 검사 키로 쓰면, 해당 필드 제거 시 seed도 함께 수정해야 하는 의존성이 생긴다. 처음부터 실제 비즈니스 유니크 조합(projectId+subcontractorId, name 등)을 dedup 키로 설정할 것.

## API 설계

### service/controller/client 3곳 동시 업데이트 #coding #api
NestJS에서 서비스 메서드 시그니처를 먼저 고정하면 새 필드(예: effectiveDate)를 추가할 때
서비스→컨트롤러→프론트 api.ts 세 곳을 모두 업데이트해야 한다.
한 곳만 수정하면 런타임에 undefined가 조용히 무시된다.

## RBAC / 권한 UI

### canEdit 권한은 모든 쓰기 진입점에 일관 적용 #coding #rbac
등록 버튼과 변경 버튼 중 하나만 권한 체크를 적용하면 viewer가 다른 경로로 쓰기 작업을 할 수 있다.
컴포넌트를 추가/복사할 때마다 canEdit 조건이 포함됐는지 확인할 것.

## Browser Automation

### window.confirm()이 Chrome 익스텐션 CDP를 블로킹함 #coding #browser-automation
브라우저 자동화 도중 `window.confirm()` 다이얼로그가 열리면 모든 CDP 이벤트가 차단되어 이후 도구 호출이 응답하지 않는다. 자동화 시작 전 `window.confirm = () => true`를 JavaScript로 주입해서 미리 우회해야 함.

## PowerShell

### PowerShell $PID는 예약 변수 #coding #powershell
`$PID`는 PowerShell 프로세스 자체의 PID를 가리키는 예약 자동 변수로, 값을 할당할 수 없다. 프로젝트 ID 등 임시 변수명은 `$proj`, `$item`, `$targetId` 등 다른 이름을 사용할 것.
