# Changelog

## 현재 상태
<!-- /wrap이 매 세션 이 섹션을 업데이트합니다 -->
- **상태:** 개발 진행 중 (Phase 3) — 기성현황 입력·승인 + 삭제요청 플로우 완성
- **주요 기능:**
  - 로그인 (JWT, admin/pm/viewer — 공통 비밀번호 `ct1234!`)
  - 사이드바 아코디언: 도급계약(발주처·기성현황) / 하도급계약(하도급사·기성현황)
  - 발주처 관리 `/clients`
  - 하도급사 관리 `/subcontractors`
  - 도급계약 관리 `/projects` + 변경계약 + Admin 직접 삭제 + PM 삭제요청 플로우
  - 하도급계약 관리 `/subcontracts` + 변경계약 + Admin 직접 삭제 + PM 삭제요청 플로우
  - 도급 기성현황 `/project-billings` (발주처 기성 월별 콤마 입력·승인, 계약 자동 연동)
  - 하도급 기성현황 `/billings` (하도급사 기성 월별 콤마 입력·승인, 계약 자동 연동)
  - 대시보드 KPI + 차트 (Recharts)
  - RBAC: admin=직접삭제, pm=등록·변경·삭제요청, viewer=조회만
- **알려진 이슈:** 없음

## 세션 로그
<!-- ⚠️ APPEND ONLY — 아래 항목을 절대 삭제/수정하지 마세요. 새 항목은 이 줄 바로 아래에 추가합니다. -->

### 2026-05-27 (3차)
- 기성금액 입력 콤마 포맷 (focusedId + e.target.select()), 당월 계획액 제거, 기성금액 명칭 변경
- 비고 컬럼 신설: 변경·삭제요청 버튼 가운데 정렬, PM 삭제요청 → Admin 요청확인란 플로우
- 삭제요청 API 400 수정: `CreateDeleteRequestDto` class-validator 데코레이터 추가
- Admin 직접 삭제 버튼 추가 (`DELETE /api/projects/:id`, `DELETE /api/subcontracts/:id`)

### 2026-05-27 (2차)
- 사이드바 재구조화: 도급계약(발주처·기성현황) / 하도급계약(하도급사·기성현황) 아코디언, childParentMap으로 단일 확장 보장
- 신규 백엔드: ProjectBilling 엔티티 + `/project-billings` API (도급 기성현황)
- 신규 프론트 페이지: `/project-billings` (발주처 기성 입력), `/subcontractors` (하도급사 목록/등록)
- 명칭 변경: 도급>거래처→발주처, 하도급>거래처→하도급사
- 테스트 플랜(TC-01~09) 수립 + seed DB 초기화

### 2026-05-27
- 하도급계약 페이지에 변경계약 버튼/모달 추가 (admin·pm 전용, viewer 등록 버튼도 숨김)
- 백엔드 `subcontracts.addChange`에 `effectiveDate` 파라미터 추가 (controller + service)
- `api.ts` `subcontracts.addChange` 타입에 `effectiveDate?: string` 추가

### 2026-05-26
- 도급계약: 계약일 컬럼/모달 추가, 시작일→착공일·종료일→준공일 명칭 변경, 변경계약 버튼(admin·pm)
- 하도급계약: 계약번호 admin만 표시, 계약금액 콤마 자동 포맷
- 발주처: 사업자번호 000-00-00000 자동 포맷, 10자리 필수, 중복체크 버튼
- 로그인 화면: pm·viewer 계정 빠른 입력 버튼 표시 (admin 제외)
- backend: pm·viewer 테스트 계정 자동 생성 (onModuleInit)
- RBAC: useIsAdmin·useCanEdit 훅, 프로젝트코드·계약번호 admin만 표시
