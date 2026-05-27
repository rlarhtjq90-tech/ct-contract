# 교훈 기록 (Lessons Learned)

코딩 및 전략 교훈. /wrap 세션에서 기록됩니다.
#coding 태그 항목은 SessionStart 시 자동 주입됩니다.
반복 패턴은 /wrap HITL 승급을 통해 적절한 vehicle로 적용됩니다.

## API 설계

### service/controller/client 3곳 동시 업데이트 #coding #api
NestJS에서 서비스 메서드 시그니처를 먼저 고정하면 새 필드(예: effectiveDate)를 추가할 때
서비스→컨트롤러→프론트 api.ts 세 곳을 모두 업데이트해야 한다.
한 곳만 수정하면 런타임에 undefined가 조용히 무시된다.

## RBAC / 권한 UI

### canEdit 권한은 모든 쓰기 진입점에 일관 적용 #coding #rbac
등록 버튼과 변경 버튼 중 하나만 권한 체크를 적용하면 viewer가 다른 경로로 쓰기 작업을 할 수 있다.
컴포넌트를 추가/복사할 때마다 canEdit 조건이 포함됐는지 확인할 것.
