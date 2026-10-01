# groupware-sync-bot

portal.ctgroup.co.kr 전자결재의 "자금신청(현장 외주비)" 종결 문서를 읽어서
ct-contract 백엔드(`/api/groupware-import/documents`)로 보내는 스크립트.
사람이 다시 손으로 입력하지 않도록, Windows 작업 스케줄러로 주기 실행한다.

## 설치

```
cd groupware-sync-bot
npm install
copy .env.example .env
```

`.env`를 열어 그룹웨어 서비스 계정, `CT_INGEST_API_KEY`(ct-contract 백엔드 Vercel
환경변수 `GROUPWARE_INGEST_API_KEY`와 동일한 값)를 채운다.

## 최초 실행 — 반드시 dry-run으로 먼저 확인

```
npm run sync:dry
```

브라우저 창이 뜨고(headed), 실제로 전송하지 않고 `scraped-output.json`에 결과만 저장한다.
이 파일을 열어 거래처/현장명/금액이 실제 문서와 맞게 긁혔는지 확인할 것.

**틀어지기 쉬운 지점 (최초 1회 눈으로 꼭 확인):**
1. 로그인 폼 — `.env`의 `GW_ID_SELECTOR` / `GW_PW_SELECTOR` / `GW_SUBMIT_SELECTOR`가
   실제 로그인 페이지의 입력칸과 맞는지. 이미 세션이 로그인되어 있으면 이 단계는 건너뜀.
2. 결재일 범위 입력 — 달력 위젯 때문에 `sync.js`의 `setDateRangeRecent`가 실패할 수 있음.
   실패해도 치명적이지 않음(기본 범위로 계속 진행, 서버가 중복은 알아서 스킵).
3. 지출내역 표 파싱 — `sync.js`의 `EXPENSE_COLUMNS` 순서가 실제 표 컬럼 순서와 다르면
   값이 밀려서 들어감. `scraped-output.json`으로 꼭 검증.

문제없이 확인되면 실제 전송:

```
npm run sync
```

## Windows 작업 스케줄러 등록

1. 작업 스케줄러 → 기본 작업 만들기
2. 트리거: 매 시간 (또는 원하는 주기)
3. 동작: 프로그램 시작
   - 프로그램: `node.exe` 전체 경로 (예: `C:\Program Files\nodejs\node.exe`)
   - 인수: `sync.js`
   - 시작 위치: 이 폴더의 전체 경로 (`...\groupware-sync-bot`)
4. "사용자가 로그온했는지 여부에 관계없이 실행"을 켜면 PC가 잠겨 있어도 동작하지만,
   작업 스케줄러에 비밀번호를 저장해야 함 — 보안 트레이드오프이니 신중히 결정.

## 동작 요약

- 매번 "최근 N일"(`SYNC_DAYS_BACK`, 기본 7일) 범위를 다시 조회해서 보낸다.
  겹치는 기간을 또 보내도 ct-contract 쪽에서 문서의 `externalKey`로 중복을 걸러내므로 안전하다.
- 분류(하도급기성 vs 기타)와 거래처/현장 매칭은 전부 ct-contract 백엔드가 수행한다.
  이 봇은 "긁어서 보내기"만 담당한다.
- 매칭이 애매한 건은 ct-contract의 "외주비 자동연동" 검토 화면(`/groupware-import`)에 쌓인다.
- 실행 로그는 `sync.log`에 계속 쌓인다(append).
