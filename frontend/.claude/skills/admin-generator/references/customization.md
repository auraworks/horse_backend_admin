# Admin Generator - 커스터마이징 가이드

## 🎨 개요

Admin Generator로 생성된 페이지는 기본 템플릿을 제공하지만, 프로젝트 요구사항에 맞게 커스터마이징할 수 있습니다.

## 🔧 기본 커스터마이징

### 1. 색상 변경

생성된 페이지는 Tailwind 클래스를 사용하므로 쉽게 색상을 변경할 수 있습니다.

**Primary 색상 변경**:

```tsx
// Before
<Button className="bg-primary hover:bg-primary/90">저장</Button>

// After (빨간색으로 변경)
<Button className="bg-red-500 hover:bg-red-600">저장</Button>
```

**배경색 변경**:

```tsx
// Before
<div className="bg-[#F3F2F0] p-8">

// After
<div className="bg-gray-100 p-8">
```

### 2. 간격 조정

```tsx
// Before - 기본 간격
<div className="flex flex-col gap-4">

// After - 간격 확대
<div className="flex flex-col gap-6">
```

### 3. 폰트 크기 조정

```tsx
// Before
<h1 className="text-2xl font-semibold">

// After
<h1 className="text-3xl font-bold">
```

## 📝 폼 커스터마이징

### 필드 추가

생성된 폼에 새로운 필드를 추가하려면:

```tsx
// ProductForm.tsx에 이미지 업로드 필드 추가

{/* 기존 필드들 */}

{/* 이미지 업로드 추가 */}
<div className="flex items-center gap-4 w-full">
  <div className="flex w-[160px] h-10 py-2 items-center gap-1 shrink-0">
    <span className="text-[#6D6D6D] font-semibold text-xl leading-6">
      이미지
    </span>
  </div>
  <Input
    type="file"
    accept="image/*"
    className="flex-1 h-10 bg-white border-[#EBEBEB]"
  />
</div>
```

### 유효성 검사 추가

React Hook Form과 Zod를 사용한 유효성 검사:

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const formSchema = z.object({
  productName: z.string().min(1, "상품명은 필수입니다"),
  price: z.number().min(0, "가격은 0 이상이어야 합니다"),
  email: z.string().email("올바른 이메일 형식이 아닙니다"),
});

export default function ProductForm({ mode, initialData }: ProductFormProps) {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: initialData,
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    console.log("유효성 검사 통과:", data);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* 폼 필드들 */}
    </form>
  );
}
```

### 조건부 필드

특정 조건에 따라 필드를 표시/숨김:

```tsx
const [category, setCategory] = React.useState(initialData?.category);

{/* 카테고리 선택 */}
<Select value={category} onValueChange={setCategory}>
  {/* ... */}
</Select>

{/* 카테고리가 '도서'일 때만 ISBN 필드 표시 */}
{category === "book" && (
  <div className="flex items-center gap-4 w-full">
    <div className="flex w-[160px] h-10 py-2 items-center gap-1 shrink-0">
      <span className="text-[#6D6D6D] font-semibold text-xl leading-6">
        ISBN
      </span>
    </div>
    <Input
      type="text"
      placeholder="ISBN을 입력해주세요"
      className="flex-1 h-10 bg-white border-[#EBEBEB]"
    />
  </div>
)}
```

## 📊 테이블 커스터마이징

### 컬럼 추가

```tsx
// 목록 페이지 (page.tsx)에 썸네일 컬럼 추가

<TableHead>썸네일</TableHead>

{/* 데이터 행에 */}
<TableCell>
  <img
    src={item.thumbnail}
    alt={item.productName}
    className="w-12 h-12 object-cover rounded"
  />
</TableCell>
```

### 정렬 기능 추가

```tsx
const [sortField, setSortField] = React.useState<string>("createdAt");
const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");

const handleSort = (field: string) => {
  if (sortField === field) {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  } else {
    setSortField(field);
    setSortOrder("asc");
  }
};

// 테이블 헤더에 정렬 버튼 추가
<TableHead>
  <button
    onClick={() => handleSort("productName")}
    className="flex items-center gap-1"
  >
    상품명
    {sortField === "productName" && (
      <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
    )}
  </button>
</TableHead>
```

### 행 클릭 이벤트

```tsx
<TableRow
  className="cursor-pointer hover:bg-gray-50"
  onClick={() => router.push(`/admin/products/${item.id}`)}
>
  {/* 테이블 셀들 */}
</TableRow>
```

## 🔍 필터 커스터마이징

### 검색 필드 추가

```tsx
const [searchQuery, setSearchQuery] = React.useState("");
const [categoryFilter, setCategoryFilter] = React.useState("all");

{/* 검색 영역 */}
<div className="flex gap-4">
  <Input
    type="text"
    placeholder="상품명 검색"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="flex-1"
  />

  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
    <SelectTrigger className="w-[200px]">
      <SelectValue placeholder="카테고리" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">전체</SelectItem>
      <SelectItem value="book">도서</SelectItem>
      <SelectItem value="electronics">전자제품</SelectItem>
    </SelectContent>
  </Select>
</div>
```

### 날짜 범위 필터

```tsx
import { Calendar } from "@/components/ui/Calendar";

const [dateFrom, setDateFrom] = React.useState<Date>();
const [dateTo, setDateTo] = React.useState<Date>();

{/* 날짜 범위 선택 */}
<div className="flex gap-2 items-center">
  <Calendar
    mode="single"
    selected={dateFrom}
    onSelect={setDateFrom}
  />
  <span>~</span>
  <Calendar
    mode="single"
    selected={dateTo}
    onSelect={setDateTo}
  />
</div>
```

## 🎯 API 연동

### 데이터 가져오기

```tsx
"use client";

import { useEffect, useState } from "react";

export default function ProductListPage() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products")
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return <div>로딩중...</div>;
  }

  return (
    <div>
      {/* 테이블 렌더링 */}
    </div>
  );
}
```

### 데이터 저장

```tsx
const handleSave = async () => {
  const formData = {
    productName: form.getValues("productName"),
    price: form.getValues("price"),
    // ...
  };

  try {
    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      alert("저장되었습니다");
      router.push("/admin/products");
    }
  } catch (error) {
    console.error("저장 실패:", error);
  }
};
```

## 🔐 권한 관리

### 역할 기반 접근 제어

```tsx
import { useSession } from "next-auth/react";

export default function ProductForm({ mode, initialData }: ProductFormProps) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  return (
    <div>
      {/* 관리자만 삭제 버튼 표시 */}
      {mode === "edit" && isAdmin && (
        <Button variant="secondary" onClick={handleDelete}>
          삭제
        </Button>
      )}
    </div>
  );
}
```

## 📱 반응형 디자인

### 모바일 레이아웃

```tsx
{/* 데스크톱: 2열, 모바일: 1열 */}
<div className="flex flex-col md:flex-row gap-4 w-full">
  <div className="flex items-center gap-4 flex-1">
    {/* 첫 번째 필드 */}
  </div>
  <div className="flex items-center gap-4 flex-1">
    {/* 두 번째 필드 */}
  </div>
</div>

{/* 모바일에서 테이블 숨김, 카드 표시 */}
<div className="hidden md:block">
  <Table>{/* 테이블 */}</Table>
</div>

<div className="md:hidden space-y-4">
  {products.map(product => (
    <div key={product.id} className="border rounded p-4">
      <h3>{product.productName}</h3>
      <p>{product.price}원</p>
    </div>
  ))}
</div>
```

## 🎨 디자인 시스템 오버라이드

### 전역 스타일 커스터마이징

```tsx
// globals.css에 추가

.admin-form-label {
  @apply flex w-[160px] h-10 py-2 items-center gap-1 shrink-0;
}

.admin-form-label-text {
  @apply text-[#6D6D6D] font-semibold text-xl leading-6;
}

.admin-form-input {
  @apply flex-1 h-10 bg-white border-[#EBEBEB] text-sm font-medium leading-5;
}
```

사용:

```tsx
<div className="admin-form-label">
  <span className="admin-form-label-text">상품명</span>
</div>
<Input className="admin-form-input" />
```

## 📚 다음 단계

- [예제](./examples.md) - 실전 커스터마이징 예제
- [필드 타입](./field-types.md) - 필드 타입별 가이드
