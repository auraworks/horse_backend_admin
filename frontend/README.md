# frontend (Horse Admin)

말 사진 관리자 웹 (Next.js 16, React 19, Tailwind 4). 로컬에서 실행하며 배포하지 않습니다.

```bash
npm install
cp .env.example .env.local   # BACKEND_API_URL, API_ACCESS_KEY, SESSION_SECRET
npm run dev                  # http://localhost:3000/admin  (기본 로그인 admin / 123456789, 운영 전 변경)
```

- Next 서버가 `/api/backend/*`, `/api/photos/*`로 백엔드에 프록시하며 `X-API-Key`를 주입하므로 브라우저에 키가 노출되지 않습니다.
- 페이지: 대시보드, 말 목록, 말 상세(부위별 사진 뷰어, 메타데이터, 다운로드).
- 환경변수와 전체 구성은 루트 [README](../README.md) 참고.

기반 템플릿: https://github.com/auraworks/nextjs_admin_master.git
