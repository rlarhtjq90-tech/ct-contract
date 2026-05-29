# 교훈 기록 (Lessons Learned)

코딩 및 전략 교훈. /wrap 세션에서 기록됩니다.
#coding 태그 항목은 SessionStart 시 자동 주입됩니다.
반복 패턴은 /wrap HITL 승급을 통해 적절한 vehicle로 적용됩니다.

## NestJS

### ValidationPipe forbidNonWhitelisted 사용 시 DTO 데코레이터 필수 #coding #nestjs
`ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`를 설정하면
DTO 클래스의 **모든** 필드에 `@IsString()`, `@IsNumber()` 등 class-validator 데코레이터가 있어야 한다.
데코레이터가 없으면 "property X should not exist" 400 에러로 전체 요청이 거부된다.

### dist 업데이트 후 수동 재시작 확인 필수 #coding #nestjs
`nest start --watch`가 실행 중이어도 포트에 실제로 바인딩된 PID가 새 dist를 사용하는지 보장되지 않는다.
파일 수정 후 `Get-NetTCPConnection -LocalPort 4000` → PID 확인 → `Stop-Process` 후 재시작 패턴이 확실함.

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
