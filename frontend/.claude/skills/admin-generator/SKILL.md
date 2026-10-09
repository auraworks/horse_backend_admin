---
name: admin-generator
description: 관리자 페이지 CRUD 구조 자동 생성 도구. Next.js 관리자 페이지에 목록/상세/수정/신규 페이지를 일관된 디자인으로 생성. 테이블 목록, 검색 필터, 페이지네이션, 폼 입력, 유효성 검사 포함. 상품관리, 리뷰관리, 주문관리 등 반복적인 CRUD 페이지 빠르게 구축.
---

# Admin Generator - 관리자 페이지 자동 생성기

Next.js 관리자 페이지의 CRUD 구조를 자동으로 생성하는 스킬입니다. 일관된 디자인 시스템을 적용하여 상품관리, 리뷰관리, 주문관리 등의 반복적인 관리 페이지를 빠르게 구축할 수 있습니다.

## 🤖 자동 실행 지침 (Claude Code용)

**이 스킬이 호출되면 다음 단계를 자동으로 수행해야 합니다:**

### Step 1: 사용자 입력 받기

AskUserQuestion 도구를 사용하여 다음 정보를 수집:

**필수 정보:**
1. **모듈명 (module)** - 영문 복수형 (예: products, reviews, orders)
2. **한글 제목 (title)** - 표시될 이름 (예: 상품, 리뷰, 주문)
3. **URL 경로 (path)** - 라우팅 경로 (예: /admin/products)

**선택 정보:**
4. **테이블 컬럼** - 목록 페이지에 표시할 컬럼들
5. **폼 필드** - 등록/수정 폼의 입력 필드들
6. **필터 항목** - 검색 필터 정의

### Step 2: 모듈명 검증

- Glob 도구로 `app/admin/(main)/{module}/` 경로 존재 확인
- 이미 존재하면 사용자에게 다른 이름 요청
- 모듈명이 영문 소문자인지 검증

### Step 3: 디렉토리 구조 생성

다음 디렉토리 구조 생성:
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

### Step 4: 템플릿 파일 읽기

다음 템플릿 파일들을 Read 도구로 읽어옴:
- `scripts/list-page.template.tsx` - 목록 페이지 템플릿
- `scripts/form.template.tsx` - 폼 컴포넌트 템플릿

### Step 5: 목록 페이지 생성

`scripts/list-page.template.tsx` 템플릿을 읽어서 다음 변수 치환:
- `{{MODULE_NAME_PASCAL}}` → Products, Reviews 등 (PascalCase)
- `{{MODULE_NAME_CAMEL}}` → products, reviews 등 (camelCase)
- `{{TITLE}}` → 상품, 리뷰 등
- `{{BASE_PATH}}` → /admin/products 등
- `{{DATE_FILTER_LABEL}}` → 등록일, 가입일 등
- `{{COUNT_UNIT}}` → 명, 개, 건 등
- `{{ID_FIELD}}` → productId, reviewId 등
- `{{SAMPLE_DATA}}` → 샘플 데이터 배열
- `{{TABLE_HEADERS}}` → 테이블 헤더 JSX
- `{{TABLE_CELLS}}` → 테이블 셀 JSX
- `{{ADDITIONAL_FILTERS}}` → 추가 필터 JSX
- `{{SEARCH_DEFAULT}}` → 기본 검색 옵션
- `{{SEARCH_OPTIONS}}` → 검색 옵션 JSX

생성된 내용을 `app/admin/(main)/{module}/page.tsx`에 Write

**중요**:
- `{{SAMPLE_DATA}}` 위치에는 샘플 데이터 생성 함수와 `const allTableData = generate...()` 코드 삽입
- programs/manage 페이지 구조를 정확히 따름 (useScrollUp, 실제 페이지네이션 등)

### Step 6: 폼 컴포넌트 생성

**마스터 페이지 참조**: `app/admin/(main)/programs/list/components/ProgramForm.tsx`
- 이 페이지는 모든 폼 요소를 포함한 완성된 마스터 페이지입니다
- 참고할 요소: Input, Textarea, Select, Checkbox, Radio, RichTextEditor, 이미지 업로드

`scripts/form.template.tsx` 템플릿을 읽어서 다음 변수 치환:
- `{{MODULE_NAME_PASCAL}}` → Products, Reviews 등
- `{{TITLE}}` → 상품, 리뷰 등
- `{{FORM_FIELDS_TYPE}}` → 폼 필드 타입 정의
- `{{FORM_STATE}}` → useState 코드
- `{{FORM_FIELDS}}` → 폼 필드 JSX

생성된 내용을 `app/admin/(main)/{module}/components/{Module}Form.tsx`에 Write

**ProgramForm.tsx의 주요 기능:**
- ✅ Text Input (작가명 한/영)
- ✅ Select (장르 선택)
- ✅ Textarea (작가 소개)
- ✅ RichTextEditor (상세내용) - dynamic import with SSR disabled
- ✅ Checkbox (노출/미노출)
- ✅ Radio buttons (분류유형 Type-A/Type-B)
- ✅ 이미지 업로드 (다중 이미지, 프리뷰, 삭제 버튼)
- ✅ useScrollUp, useToast, useModal 훅 활용
- ✅ mode prop (new/edit)
- ✅ 저장/취소/삭제 버튼

### Step 7: 신규 페이지 생성

다음 내용으로 `app/admin/(main)/{module}/new/page.tsx` 생성:
```typescript
import {ModuleName}Form from "../components/{ModuleName}Form";

export default function {ModuleName}NewPage() {
  return <{ModuleName}Form mode="new" />;
}
```

**중요**: Next.js 14+ 규칙에 따라 정확한 import 경로 사용

### Step 8: 상세 페이지 생성 (수정)

다음 내용으로 `app/admin/(main)/{module}/[id]/page.tsx` 생성:
```typescript
import {ModuleName}Form from "../components/{ModuleName}Form";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function {ModuleName}DetailPage({ params }: PageProps) {
  const { id } = await params;

  // 샘플 데이터 (실제로는 API 호출)
  const initialData = {
    // ... 필드별 샘플 데이터
  };

  return <{ModuleName}Form mode="edit" initialData={initialData} />;
}
```

### Step 8: Sidebar 메뉴 자동 추가

`components/ui/Sidebar/constants.ts` 파일을 Read하여 현재 메뉴 구조 파악 후, Edit 도구로 새 메뉴 항목 추가:

```typescript
// menuSections 배열의 첫 번째 섹션의 items 배열에 추가
{
  label: "{title} 관리",
  href: "{path}"
}
```

**중요**:
- 기존 menuSections의 첫 번째 섹션 (header: "관리")의 items 배열 끝에 추가
- subItems가 없는 단순 메뉴 아이템으로 추가
- 이미 존재하는 href인지 확인 후 중복 방지

### Step 9: 완료 메시지

사용자에게 다음 정보 제공:
```
✅ {모듈명} 관리 페이지 생성 완료!

생성된 파일:
📄 app/admin/(main)/{module}/page.tsx (목록 페이지)
📄 app/admin/(main)/{module}/components/{Module}Form.tsx (폼)
📄 app/admin/(main)/{module}/new/page.tsx (신규)
📄 app/admin/(main)/{module}/[id]/page.tsx (상세/수정)

✅ Sidebar 메뉴 추가됨:
📋 "{title} 관리" → {path}

다음 단계:
1. 실제 API 연동 구현
2. 필요시 유효성 검사 추가 (React Hook Form + Zod)
3. 테이블 샘플 데이터를 실제 데이터로 교체
4. npm run dev로 확인: http://localhost:3000{path}
```

## 핵심 워크플로우

관리자 페이지 생성 흐름은 4단계로 구성됩니다:

1. **설정 수집**: 사용자로부터 모듈명, 제목, 컬럼 정보 등을 입력받음
2. **템플릿 처리**: 템플릿 파일을 읽어서 변수를 실제 값으로 치환
3. **파일 생성**: 목록/폼/신규/상세 페이지를 자동으로 생성
4. **Sidebar 연동**: Sidebar 메뉴에 자동으로 등록하여 즉시 사용 가능

## 빠른 시작

### 기본 사용법

```bash
/admin-generator
```

스킬이 실행되면 대화형으로 필요한 정보를 입력합니다.

### 예제 1: 상품 관리 생성

```
모듈명: products
한글 제목: 상품
URL 경로: /admin/products
단위: 개

테이블 컬럼:
- No (번호)
- 상품ID (productId)
- 상품명 (productName)
- 카테고리 (category)
- 가격 (price)
- 재고 (stock)
- 상태 (status)
- 등록일 (createdAt)

폼 필드:
- 상품명(한) (productNameKo, text, 필수)
- 상품명(영) (productNameEn, text, 선택)
- 카테고리 (category, select, 필수)
- 가격 (price, number, 필수)
- 재고 (stock, number, 필수)
- 설명 (description, textarea, 선택)
- 노출여부 (isVisible, checkbox)

필터:
- 등록일 (날짜 범위)
- 카테고리 (select: 전체/도서/문구/기타)
- 상태 (select: 전체/판매중/품절)
```

### 예제 2: 리뷰 관리 생성

```
모듈명: reviews
한글 제목: 리뷰
URL 경로: /admin/reviews
단위: 건

테이블 컬럼:
- No
- 리뷰ID (reviewId)
- 작성자 (authorName)
- 상품명 (productName)
- 평점 (rating)
- 내용 (content, 미리보기 50자)
- 작성일 (createdAt)
- 상태 (status)

폼 필드:
- 작성자명 (authorName, text, 필수)
- 상품 (productId, select, 필수)
- 평점 (rating, number 1-5, 필수)
- 제목 (title, text, 필수)
- 내용 (content, textarea, 필수)
- 상태 (status, select: 대기/승인/거부)
- 노출여부 (isVisible, checkbox)

필터:
- 작성일 (날짜 범위)
- 평점 (select: 전체/5점/4점/3점/2점/1점)
- 상태 (select: 전체/대기/승인/거부)
```

## 생성되는 페이지 구조

### 목록 페이지 (page.tsx)

**마스터 페이지**: `app/admin/(main)/programs/manage/page.tsx`

자동 생성되는 구성 요소:
- ✅ 페이지 제목
- ✅ 검색 필터 섹션 (날짜, 카테고리, 상태 등)
- ✅ 결과 요약 (총 N개/명/건)
- ✅ 액션 버튼 (엑셀 다운로드, 등록)
- ✅ 데이터 테이블 (정렬, 클릭 이벤트)
- ✅ 페이지네이션 (실제 slice 기반)
- ✅ useScrollUp 훅 사용

### 폼 페이지 (Form.tsx)

**마스터 페이지**: `app/admin/(main)/programs/list/components/ProgramForm.tsx`
- 모든 폼 요소를 포함한 완성된 참고 페이지

자동 생성되는 구성 요소:
- ✅ 페이지 제목 (등록/상세)
- ✅ 입력 필드들 (Text, Select, Textarea, Checkbox, Radio 등)
- ✅ RichTextEditor (상세내용 편집)
- ✅ 이미지 업로드 (다중 업로드, 프리뷰, 삭제)
- ✅ 유효성 검사 표시 (필수 필드 *)
- ✅ 액션 버튼 (저장, 취소, 삭제)
- ✅ mode에 따른 조건부 렌더링
- ✅ useScrollUp, useToast, useModal 훅

## 템플릿 시스템

### 사용 가능한 템플릿 변수

**기본 변수:**
- `{{MODULE_NAME_PASCAL}}` - Products, Reviews (모듈명 PascalCase)
- `{{MODULE_NAME_CAMEL}}` - products, reviews (모듈명 camelCase)
- `{{TITLE}}` - 상품, 리뷰 (한글 제목)
- `{{BASE_PATH}}` - /admin/products (URL 경로)
- `{{COUNT_UNIT}}` - 명, 개, 건 (단위)
- `{{ID_FIELD}}` - productId, reviewId (ID 필드명)

**목록 페이지 변수:**
- `{{DATE_FILTER_LABEL}}` - 등록일, 가입일, 작성일
- `{{SAMPLE_DATA}}` - 테이블 샘플 데이터
- `{{TABLE_HEADERS}}` - 테이블 헤더 JSX
- `{{TABLE_CELLS}}` - 테이블 셀 JSX
- `{{ADDITIONAL_FILTERS}}` - 추가 필터 JSX
- `{{SEARCH_DEFAULT}}` - 기본 검색 옵션
- `{{SEARCH_OPTIONS}}` - 검색 옵션 SelectItem JSX

**폼 변수:**
- `{{FORM_FIELDS_TYPE}}` - TypeScript 인터페이스 필드
- `{{FORM_STATE}}` - useState 초기화 코드
- `{{FORM_FIELDS}}` - 폼 필드 JSX (Input, Select 등)

### 필드 타입별 생성 규칙

**참고**: `app/admin/(main)/programs/list/components/ProgramForm.tsx`에서 모든 필드 타입의 실제 구현을 확인할 수 있습니다.

**Text Input:**
```tsx
<div className="flex items-center gap-4 flex-1">
  <div className="flex w-[160px] h-10 py-2 items-center gap-1 shrink-0">
    <span className="text-[#6D6D6D] font-semibold text-xl leading-6">
      {label}
    </span>
    {required && <span className="text-[#D65856] font-semibold text-xl leading-6">*</span>}
  </div>
  <Input
    type="text"
    placeholder="{label}을(를) 입력해주세요"
    defaultValue={initialData?.{fieldName} ?? ""}
    className="flex-1 h-10 bg-white border-[#EBEBEB] text-sm font-medium leading-5 placeholder:text-[#E3E3E3]"
  />
</div>
```

**Select:**
```tsx
<Select defaultValue={initialData?.{fieldName} ?? "{defaultValue}"}>
  <SelectTrigger className="flex-1 h-10 bg-white border-[#EBEBEB]">
    <SelectValue placeholder="{label} 선택" />
  </SelectTrigger>
  <SelectContent>
    {options.map(option => (
      <SelectItem value={option.value}>{option.label}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

**Textarea:**
```tsx
<Textarea
  placeholder="{label}을(를) 입력해주세요"
  defaultValue={initialData?.{fieldName} ?? ""}
  className="flex-1 h-[181px] bg-white border-[#EBEBEB] text-sm font-medium leading-5 placeholder:text-[#E3E3E3] resize-none"
/>
```

**RichTextEditor:** (참고: ProgramForm.tsx 라인 227-242)
```tsx
const RichTextEditor = dynamic(
  () => import("@/components/ui/RichTextEditor/RichTextEditor").then(mod => ({
    default: mod.RichTextEditor,
  })),
  { ssr: false }
);

<RichTextEditor
  placeholder="상세 내용을 입력해주세요"
  value={detailedContent}
  onChange={setDetailedContent}
  className="w-full"
/>
```

**이미지 업로드:** (참고: ProgramForm.tsx 라인 340-396)
```tsx
const [uploadedImages, setUploadedImages] = React.useState<
  Array<{ id: string; url: string; file: File }>
>([]);
const fileInputRef = React.useRef<HTMLInputElement>(null);

<input
  ref={fileInputRef}
  type="file"
  accept="image/*"
  multiple
  onChange={handleFileUpload}
  className="hidden"
/>
<Button onClick={() => fileInputRef.current?.click()}>
  <Plus className="w-6 h-6 text-white" />
  파일첨부
</Button>

{/* 이미지 프리뷰 카드 */}
{uploadedImages.map((image) => (
  <div className="relative w-[200px] h-[200px] rounded-lg border-2">
    <img src={image.url} className="w-full h-full object-cover" />
    <button onClick={() => handleRemoveImage(image.id)}>
      <X className="w-4 h-4 text-black" />
    </button>
  </div>
))}
```

**Checkbox:**
```tsx
<Checkbox
  id="{fieldName}"
  checked={state.{fieldName}}
  onCheckedChange={(checked) => setState({...state, {fieldName}: checked as boolean})}
/>
<Label htmlFor="{fieldName}">{label}</Label>
```

**Radio Buttons:** (참고: ProgramForm.tsx 라인 284-337)
```tsx
const [classificationType, setClassificationType] = React.useState<"type-a" | "type-b">("type-a");

<label className="flex items-center gap-2 flex-1 cursor-pointer">
  <div
    className="flex w-4 h-4 p-1 justify-center items-center rounded-full border border-[#E5E5E5] bg-white shadow-sm relative"
    onClick={() => setClassificationType("type-a")}
  >
    {classificationType === "type-a" && (
      <div className="w-2 h-2 rounded-full bg-[#171717] absolute"></div>
    )}
  </div>
  <span>Type-A</span>
</label>
```

## 디자인 시스템

생성되는 모든 페이지는 일관된 디자인 시스템을 따릅니다:

### 색상 팔레트
- Primary: `#08F` (파란색)
- Text Primary: `#0A0A0A` (거의 검정)
- Text Secondary: `#6D6D6D` (회색)
- Text Muted: `#727272` (밝은 회색)
- Border: `#EBEBEB` (연한 회색)
- Background: `#FAF8F6` (베이지)
- Success: `#4CA452` (녹색)
- Error: `#D65856` (빨간색)

### 타이포그래피
- 페이지 제목: `text-2xl font-semibold text-[#2A2A2A]`
- 라벨: `text-base font-semibold text-[#555]`
- 테이블 헤더: `text-xs font-medium`
- 테이블 셀: `text-xs font-medium`

### 스페이싱
- 페이지 패딩: `px-12 py-14`
- 섹션 간격: `gap-6`
- 필터 간격: `gap-[18px]`
- 버튼 간격: `gap-3`

## 참고 문서

자세한 사용법은 references 폴더를 참고하세요:

- [setup-guide.md](references/setup-guide.md) - 초기 설정 가이드
- [field-types.md](references/field-types.md) - 필드 타입별 사용법
- [customization.md](references/customization.md) - 커스터마이징 가이드
- [examples.md](references/examples.md) - 실전 예제

## 주의사항

### 모듈명 규칙
- ✅ 영문 소문자만 사용
- ✅ 복수형 사용 (products, reviews, orders)
- ❌ 대문자, 특수문자, 공백 불가
- ❌ 이미 존재하는 모듈명 불가

### 생성 후 작업
1. **Sidebar 메뉴** (자동 추가됨 ✅)
   - 스킬 실행 시 자동으로 Sidebar에 메뉴가 추가됩니다
   - `components/ui/Sidebar/constants.ts` 파일 확인

2. **API 연동** (필수)
   - 목록 조회 API
   - 상세 조회 API
   - 등록/수정/삭제 API

3. **유효성 검사** (권장)
   - React Hook Form 적용
   - Zod Schema 정의

4. **권한 관리** (권장)
   - 페이지 접근 권한
   - 버튼 노출 제어

## 트러블슈팅

### 생성 실패 시
1. 모듈명이 영문 소문자인지 확인
2. 이미 존재하는 경로가 아닌지 확인
3. 파일 쓰기 권한 확인

### TypeScript 에러
- 생성된 타입 정의가 올바른지 확인
- initialData 인터페이스와 실제 데이터 일치 확인

### 스타일 적용 안됨
- Tailwind CSS 설정 확인
- 컴포넌트 import 경로 확인

## 버전 히스토리

- **v1.0.0** (2025-12-26)
  - 초기 릴리스
  - 목록/상세/수정/신규 페이지 자동 생성
  - 템플릿 시스템 구현
  - 일관된 디자인 시스템 적용
