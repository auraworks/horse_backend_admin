# Admin Generator

관리자 페이지 CRUD 구조를 자동으로 생성하는 Claude Code 스킬입니다.

## 🚀 빠른 시작

```bash
/admin-generator
```

스킬이 실행되면 대화형으로 다음 정보를 입력하고, **자동으로 Sidebar 메뉴에 등록**됩니다!

입력 정보:
- 모듈명 (예: products, reviews)
- 한글 제목 (예: 상품, 리뷰)
- URL 경로 (예: /admin/products)
- 테이블 컬럼 정의
- 폼 필드 정의
- 필터 설정

## 📦 생성되는 파일

```
app/admin/(main)/{module}/
├── page.tsx                    # 목록 페이지
├── components/
│   └── {Module}Form.tsx       # 폼 컴포넌트
├── new/
│   └── page.tsx               # 신규 등록 페이지
└── [id]/
    └── page.tsx               # 상세/수정 페이지
```

**+ Sidebar 메뉴 자동 추가** ⭐

## ✨ 주요 기능

- ✅ **CRUD 페이지 자동 생성**: 목록, 신규, 상세, 수정 페이지를 한 번에 생성
- ✅ **programs/manage 기반**: 검증된 구조(useScrollUp, 실제 페이지네이션)
- ✅ **Sidebar 자동 연동**: 메뉴에 자동 등록되어 즉시 사용 가능 ⭐
- ✅ **테이블 & 필터**: 날짜 필터, 검색, 정렬, 페이지네이션 기본 제공
- ✅ **폼 자동 생성**: 입력 필드, 유효성 검사, 저장/취소 버튼
- ✅ **반복 작업 제거**: 상품, 리뷰, 주문 등 동일 구조 페이지 빠르게 생성

## 🎨 생성되는 구조

### 1. 목록 페이지 (`page.tsx`)
   - programs/manage 페이지 구조 기반
   - useScrollUp 훅으로 페이지 이동 시 상단 스크롤
   - 실제 페이지네이션 (slice 기반)
   - 날짜 필터, 검색, 정렬
   - 엑셀 다운로드, 신규 등록 버튼

### 2. 폼 컴포넌트 (`components/{Module}Form.tsx`)
   - mode prop으로 신규/수정 구분
   - initialData prop으로 기본값 설정
   - useScrollUp, useToast, useModal 훅 활용

### 3. 신규/상세 페이지
   - 폼 컴포넌트 래퍼
   - Next.js 14+ 규칙 준수

### 4. **Sidebar 메뉴** (자동 추가 ⭐)
   - `components/ui/Sidebar/constants.ts`에 자동 등록
   - 메뉴명: "{제목} 관리"
   - 즉시 사용 가능!

## 📖 문서

자세한 사용법은 다음 문서를 참고하세요:

- [SKILL.md](./SKILL.md) - 자동 실행 지침 및 상세 가이드
- [references/setup-guide.md](./references/setup-guide.md) - 초기 설정
- [references/field-types.md](./references/field-types.md) - 필드 타입 가이드
- [references/customization.md](./references/customization.md) - 커스터마이징
- [references/examples.md](./references/examples.md) - 실전 예제

## 💡 예제

### 상품 관리 생성

```
모듈명: products
제목: 상품
경로: /admin/products
```

생성 결과:
- `/admin/products` - 상품 목록
- `/admin/products/new` - 상품 등록
- `/admin/products/[id]` - 상품 상세/수정
- **Sidebar에 "상품 관리" 메뉴 자동 추가** ⭐

### 리뷰 관리 생성

```
모듈명: reviews
제목: 리뷰
경로: /admin/reviews
```

생성 결과:
- `/admin/reviews` - 리뷰 목록
- `/admin/reviews/new` - 리뷰 등록
- `/admin/reviews/[id]` - 리뷰 상세/수정
- **Sidebar에 "리뷰 관리" 메뉴 자동 추가** ⭐

## 🎯 다음 단계

페이지 생성 후:

1. **Sidebar 메뉴** (자동 완료 ✅)
   - 이미 자동으로 추가되었습니다!

2. **API 연동** (필수)
   - 목록/상세/등록/수정/삭제 API 구현

3. **유효성 검사** (권장)
   - React Hook Form + Zod 추가

4. **샘플 데이터 교체** (필수)
   - 테이블 샘플 데이터를 실제 데이터로 교체

5. **권한 관리** (권장)
   - 페이지 접근 권한 설정

## 📋 요구사항

- Next.js 14+
- TypeScript
- Tailwind CSS
- shadcn/ui 컴포넌트
- useScrollUp, useToast, useModal 커스텀 훅

## 🔥 핵심 장점

- ⚡ **3분 내 CRUD 페이지 생성**
- 🎨 **programs/manage 기반 검증된 구조**
- 🔗 **Sidebar 자동 연동으로 즉시 사용 가능**
- 🔄 **useScrollUp으로 UX 최적화**
- 📊 **실제 동작하는 페이지네이션**
- 🎯 **일관된 디자인 시스템**

## 📄 라이선스

MIT License

## 🤝 기여

이슈 및 풀 리퀘스트는 언제든 환영합니다!
