# Admin Generator - 필드 타입 가이드

## 📝 개요

Admin Generator는 다양한 필드 타입을 지원하여 폼과 테이블을 생성합니다. 이 문서는 각 필드 타입의 사용법과 생성되는 코드를 설명합니다.

## 🔤 텍스트 필드 (text)

### 사용 예시

```
필드명: productName
타입: text
라벨: 상품명
필수: true
```

### 생성되는 폼 코드

```tsx
<div className="flex items-center gap-4 flex-1">
  <div className="flex w-[160px] h-10 py-2 items-center gap-1 shrink-0">
    <span className="text-[#6D6D6D] font-semibold text-xl leading-6">
      상품명
    </span>
    <span className="text-[#D65856] font-semibold text-xl leading-6">*</span>
  </div>
  <Input
    type="text"
    placeholder="상품명을 입력해주세요"
    defaultValue={initialData?.productName ?? ""}
    className="flex-1 h-10 bg-white border-[#EBEBEB] text-sm font-medium leading-5 placeholder:text-[#E3E3E3]"
  />
</div>
```

### 테이블 셀 코드

```tsx
<TableCell className="text-sm font-medium leading-5 text-[#0A0A0A]">
  {item.productName}
</TableCell>
```

## 📧 이메일 필드 (email)

### 사용 예시

```
필드명: email
타입: email
라벨: 이메일
필수: true
```

### 생성되는 코드

```tsx
<Input
  type="email"
  placeholder="이메일을 입력해주세요"
  defaultValue={initialData?.email ?? ""}
  className="flex-1 h-10 bg-white border-[#EBEBEB]"
/>
```

## 🔢 숫자 필드 (number)

### 사용 예시

```
필드명: price
타입: number
라벨: 가격
필수: true
```

### 생성되는 코드

```tsx
<Input
  type="number"
  placeholder="가격을 입력해주세요"
  defaultValue={initialData?.price ?? ""}
  className="flex-1 h-10 bg-white border-[#EBEBEB]"
/>
```

## 📞 전화번호 필드 (tel)

### 사용 예시

```
필드명: phone
타입: tel
라벨: 연락처
```

### 생성되는 코드

```tsx
<Input
  type="tel"
  placeholder="연락처를 입력해주세요"
  defaultValue={initialData?.phone ?? ""}
  className="flex-1 h-10 bg-white border-[#EBEBEB]"
/>
```

## 📝 텍스트 영역 (textarea)

### 사용 예시

```
필드명: description
타입: textarea
라벨: 설명
```

### 생성되는 코드

```tsx
<div className="flex items-start gap-4 w-full">
  <div className="flex w-[160px] h-10 py-2 items-center gap-1 shrink-0">
    <span className="text-[#6D6D6D] font-semibold text-xl leading-6">
      설명
    </span>
  </div>
  <Textarea
    placeholder="설명을 입력해주세요"
    defaultValue={initialData?.description ?? ""}
    className="flex-1 min-h-[120px] bg-white border-[#EBEBEB]"
  />
</div>
```

## 🔽 셀렉트 (select)

### 사용 예시

```
필드명: status
타입: select
라벨: 상태
옵션: [
  { value: "active", label: "활성" },
  { value: "inactive", label: "비활성" },
  { value: "pending", label: "대기중" }
]
```

### 생성되는 코드

```tsx
<Select defaultValue={initialData?.status ?? "active"}>
  <SelectTrigger className="flex-1 h-10 bg-white border-[#EBEBEB]">
    <SelectValue placeholder="상태 선택" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="active">활성</SelectItem>
    <SelectItem value="inactive">비활성</SelectItem>
    <SelectItem value="pending">대기중</SelectItem>
  </SelectContent>
</Select>
```

## ☑️ 체크박스 (checkbox)

### 사용 예시

```
필드명: isVisible
타입: checkbox
라벨: 노출여부
```

### 생성되는 코드

```tsx
const [isVisible, setIsVisible] = React.useState(
  initialData?.isVisible ?? true
);

// JSX
<div className="flex items-center gap-4 w-full">
  <div className="flex w-[160px] h-10 py-2 items-center gap-1 shrink-0">
    <span className="text-[#6D6D6D] font-semibold text-xl leading-6">
      노출여부
    </span>
  </div>
  <div className="flex items-center space-x-2">
    <Checkbox
      id="isVisible"
      checked={isVisible}
      onCheckedChange={(checked) => setIsVisible(checked as boolean)}
    />
    <Label htmlFor="isVisible" className="text-sm font-medium">
      노출
    </Label>
  </div>
</div>
```

## 📅 날짜 필드 (date)

### 사용 예시

```
필드명: startDate
타입: date
라벨: 시작일
```

### 생성되는 코드

```tsx
<Input
  type="date"
  defaultValue={initialData?.startDate ?? ""}
  className="flex-1 h-10 bg-white border-[#EBEBEB]"
/>
```

## 🎨 2열 레이아웃

두 필드를 나란히 배치하려면:

```tsx
<div className="flex gap-4 w-full">
  {/* 첫 번째 필드 */}
  <div className="flex items-center gap-4 flex-1">
    {/* ... */}
  </div>

  {/* 두 번째 필드 */}
  <div className="flex items-center gap-4 flex-1">
    {/* ... */}
  </div>
</div>
```

## 📊 테이블 헤더 & 셀

### 헤더 생성

```tsx
<TableHead className="text-sm font-semibold leading-5 text-[#6D6D6D]">
  상품명
</TableHead>
```

### 셀 생성

**텍스트**:
```tsx
<TableCell className="text-sm font-medium leading-5 text-[#0A0A0A]">
  {item.productName}
</TableCell>
```

**상태 뱃지**:
```tsx
<TableCell>
  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
    item.status === "active"
      ? "bg-green-100 text-green-800"
      : "bg-gray-100 text-gray-800"
  }`}>
    {item.status === "active" ? "활성" : "비활성"}
  </span>
</TableCell>
```

**날짜 포맷**:
```tsx
<TableCell className="text-sm font-medium leading-5 text-[#0A0A0A]">
  {new Date(item.createdAt).toLocaleDateString('ko-KR')}
</TableCell>
```

## 💡 필드 조합 예제

### 상품 등록 폼

```
필드:
1. productName (text, 필수) - 상품명
2. price (number, 필수) - 가격
3. category (select) - 카테고리
4. stock (number) - 재고
5. description (textarea) - 설명
6. isVisible (checkbox) - 노출여부
```

### 회원 등록 폼

```
필드:
1. nameKo (text, 필수) - 이름(한글)
2. nameEn (text) - 이름(영문)
3. email (email, 필수) - 이메일
4. phone (tel) - 연락처
5. level (select) - 등급
6. memo (textarea) - 메모
7. isActive (checkbox) - 활성화
```

## 🔍 필드 타입 선택 가이드

| 데이터 타입 | 추천 필드 타입 | 예시 |
|------------|---------------|------|
| 짧은 텍스트 | text | 이름, 제목 |
| 긴 텍스트 | textarea | 설명, 메모 |
| 이메일 | email | 이메일 주소 |
| 숫자 | number | 가격, 재고, 정원 |
| 전화번호 | tel | 연락처 |
| 선택 옵션 | select | 상태, 카테고리, 등급 |
| 예/아니오 | checkbox | 노출여부, 활성화 |
| 날짜 | date | 시작일, 종료일 |

## 📚 다음 단계

- [커스터마이징](./customization.md) - 생성된 필드 수정
- [예제](./examples.md) - 실전 예제
