# Admin Generator - 실전 예제

## 📚 개요

이 문서는 Admin Generator를 사용한 실전 예제를 제공합니다. 각 예제는 실제 관리자 페이지에서 자주 사용되는 패턴을 보여줍니다.

## 🛒 예제 1: 상품 관리

### 요구사항

- 상품명(한글/영문), 가격, 카테고리, 재고, 설명
- 썸네일 이미지 업로드
- 노출여부 설정
- 할인 가격 (선택적)

### 스킬 실행

```bash
/admin-generator
```

### 입력 정보

```
모듈명: products
한글 제목: 상품
URL 경로: /admin/products

테이블 컬럼:
- 썸네일 (image)
- 상품명 (text)
- 카테고리 (text)
- 가격 (number)
- 재고 (number)
- 노출여부 (boolean)
- 등록일 (date)

폼 필드:
1. productNameKo (text, 필수) - 상품명(한글)
2. productNameEn (text) - 상품명(영문)
3. category (select, 필수) - 카테고리
   옵션: 도서, 전자제품, 의류, 식품
4. price (number, 필수) - 가격
5. discountPrice (number) - 할인가
6. stock (number, 필수) - 재고
7. thumbnail (file) - 썸네일
8. description (textarea) - 설명
9. isVisible (checkbox) - 노출여부

필터:
- 카테고리 (select)
- 날짜 범위 (date range)
- 노출여부 (checkbox)
```

### 생성 후 커스터마이징

#### 1. 이미지 업로드 필드 추가

```tsx
// app/admin/(main)/products/components/ProductsForm.tsx

{/* 썸네일 업로드 */}
<div className="flex items-center gap-4 w-full">
  <div className="flex w-[160px] h-10 py-2 items-center gap-1 shrink-0">
    <span className="text-[#6D6D6D] font-semibold text-xl leading-6">
      썸네일
    </span>
  </div>
  <div className="flex-1">
    <Input
      type="file"
      accept="image/*"
      onChange={handleImageUpload}
      className="h-10 bg-white border-[#EBEBEB]"
    />
    {preview && (
      <img
        src={preview}
        alt="미리보기"
        className="mt-2 w-32 h-32 object-cover rounded border"
      />
    )}
  </div>
</div>
```

#### 2. 할인가 자동 계산

```tsx
const [price, setPrice] = React.useState(initialData?.price ?? 0);
const [discountRate, setDiscountRate] = React.useState(0);
const discountPrice = price - (price * discountRate / 100);

<div className="flex gap-4 w-full">
  {/* 원가 */}
  <div className="flex items-center gap-4 flex-1">
    <div className="flex w-[160px] h-10 py-2 items-center gap-1 shrink-0">
      <span className="text-[#6D6D6D] font-semibold text-xl leading-6">
        원가
      </span>
    </div>
    <Input
      type="number"
      value={price}
      onChange={(e) => setPrice(Number(e.target.value))}
      className="flex-1 h-10 bg-white border-[#EBEBEB]"
    />
  </div>

  {/* 할인율 */}
  <div className="flex items-center gap-4 flex-1">
    <div className="flex w-[160px] h-10 py-2 items-center gap-1 shrink-0">
      <span className="text-[#6D6D6D] font-semibold text-xl leading-6">
        할인율 (%)
      </span>
    </div>
    <Input
      type="number"
      value={discountRate}
      onChange={(e) => setDiscountRate(Number(e.target.value))}
      className="flex-1 h-10 bg-white border-[#EBEBEB]"
    />
  </div>
</div>

{/* 할인가 표시 (읽기 전용) */}
<div className="flex items-center gap-4 w-full">
  <div className="flex w-[160px] h-10 py-2 items-center gap-1 shrink-0">
    <span className="text-[#6D6D6D] font-semibold text-xl leading-6">
      할인가
    </span>
  </div>
  <div className="flex-1 h-10 flex items-center px-3 bg-gray-100 border border-[#EBEBEB] rounded">
    <span className="text-lg font-semibold text-primary">
      {discountPrice.toLocaleString()}원
    </span>
  </div>
</div>
```

## ⭐ 예제 2: 리뷰 관리

### 요구사항

- 작성자, 상품, 평점, 내용
- 이미지 첨부 (다중)
- 베스트 리뷰 설정
- 신고 관리

### 입력 정보

```
모듈명: reviews
한글 제목: 리뷰
URL 경로: /admin/reviews

테이블 컬럼:
- 작성자 (text)
- 상품명 (text)
- 평점 (rating)
- 내용 미리보기 (text)
- 작성일 (date)
- 베스트 (boolean)

폼 필드:
1. author (text, 필수) - 작성자
2. productId (select, 필수) - 상품
3. rating (select, 필수) - 평점 (1~5)
4. content (textarea, 필수) - 내용
5. images (file, multiple) - 이미지
6. isBest (checkbox) - 베스트 리뷰
7. isBlocked (checkbox) - 차단
```

### 커스터마이징: 별점 표시

```tsx
// 별점 컴포넌트
const StarRating = ({ rating, onChange }: { rating: number; onChange: (rating: number) => void }) => {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="text-2xl"
        >
          {star <= rating ? "★" : "☆"}
        </button>
      ))}
    </div>
  );
};

// 폼에서 사용
const [rating, setRating] = React.useState(initialData?.rating ?? 5);

<div className="flex items-center gap-4 w-full">
  <div className="flex w-[160px] h-10 py-2 items-center gap-1 shrink-0">
    <span className="text-[#6D6D6D] font-semibold text-xl leading-6">
      평점
    </span>
    <span className="text-[#D65856] font-semibold text-xl leading-6">*</span>
  </div>
  <StarRating rating={rating} onChange={setRating} />
</div>
```

## 📅 예제 3: 이벤트 관리

### 요구사항

- 이벤트명, 기간, 배너 이미지
- 참여 대상 (전체/등급별)
- 진행 상태 자동 업데이트

### 입력 정보

```
모듈명: events
한글 제목: 이벤트
URL 경로: /admin/events

테이블 컬럼:
- 배너 (image)
- 이벤트명 (text)
- 기간 (daterange)
- 상태 (status)
- 참여자 수 (number)

폼 필드:
1. eventName (text, 필수) - 이벤트명
2. startDate (date, 필수) - 시작일
3. endDate (date, 필수) - 종료일
4. banner (file, 필수) - 배너 이미지
5. targetLevel (select) - 대상 등급
6. description (textarea) - 설명
7. isVisible (checkbox) - 노출여부
```

### 커스터마이징: 진행 상태 자동 계산

```tsx
const getEventStatus = (startDate: string, endDate: string) => {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (now < start) return { label: "예정", color: "bg-blue-100 text-blue-800" };
  if (now > end) return { label: "종료", color: "bg-gray-100 text-gray-800" };
  return { label: "진행중", color: "bg-green-100 text-green-800" };
};

// 테이블에서 사용
<TableCell>
  {(() => {
    const status = getEventStatus(item.startDate, item.endDate);
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${status.color}`}>
        {status.label}
      </span>
    );
  })()}
</TableCell>
```

## 👥 예제 4: 회원 관리 (고급)

### 요구사항

- 회원 정보 (이름, 이메일, 연락처)
- 등급 관리 (자동/수동)
- 포인트 적립/차감
- 가입일/최종 접속일

### 입력 정보

```
모듈명: members
한글 제목: 회원
URL 경로: /admin/members

테이블 컬럼:
- 이름 (text)
- 이메일 (text)
- 등급 (badge)
- 포인트 (number)
- 가입일 (date)
- 최종접속 (date)

폼 필드:
1. nameKo (text, 필수) - 이름(한글)
2. nameEn (text) - 이름(영문)
3. email (email, 필수) - 이메일
4. phone (tel) - 연락처
5. level (select, 필수) - 등급
6. point (number) - 포인트
7. memo (textarea) - 메모
8. isActive (checkbox) - 활성화
```

### 커스터마이징: 포인트 적립/차감 모달

```tsx
const [showPointModal, setShowPointModal] = React.useState(false);
const [pointAction, setPointAction] = React.useState<"add" | "subtract">("add");
const [pointAmount, setPointAmount] = React.useState(0);
const [currentPoint, setCurrentPoint] = React.useState(initialData?.point ?? 0);

const handlePointUpdate = () => {
  const newPoint = pointAction === "add"
    ? currentPoint + pointAmount
    : currentPoint - pointAmount;

  setCurrentPoint(Math.max(0, newPoint));
  setShowPointModal(false);
  setPointAmount(0);
};

{/* 포인트 필드 */}
<div className="flex items-center gap-4 w-full">
  <div className="flex w-[160px] h-10 py-2 items-center gap-1 shrink-0">
    <span className="text-[#6D6D6D] font-semibold text-xl leading-6">
      포인트
    </span>
  </div>
  <div className="flex gap-2 flex-1">
    <Input
      type="number"
      value={currentPoint}
      readOnly
      className="flex-1 h-10 bg-gray-100 border-[#EBEBEB]"
    />
    <Button
      type="button"
      variant="outline"
      onClick={() => {
        setPointAction("add");
        setShowPointModal(true);
      }}
    >
      적립
    </Button>
    <Button
      type="button"
      variant="outline"
      onClick={() => {
        setPointAction("subtract");
        setShowPointModal(true);
      }}
    >
      차감
    </Button>
  </div>
</div>

{/* 포인트 모달 */}
{showPointModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-96">
      <h3 className="text-lg font-semibold mb-4">
        포인트 {pointAction === "add" ? "적립" : "차감"}
      </h3>
      <Input
        type="number"
        placeholder="금액 입력"
        value={pointAmount}
        onChange={(e) => setPointAmount(Number(e.target.value))}
        className="mb-4"
      />
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => setShowPointModal(false)}>
          취소
        </Button>
        <Button onClick={handlePointUpdate}>
          확인
        </Button>
      </div>
    </div>
  </div>
)}
```

## 📦 예제 5: 주문 관리

### 요구사항

- 주문번호, 주문자, 상품 목록
- 배송 상태 관리
- 결제 정보
- 송장번호 입력

### 입력 정보

```
모듈명: orders
한글 제목: 주문
URL 경로: /admin/orders

테이블 컬럼:
- 주문번호 (text)
- 주문자 (text)
- 결제금액 (number)
- 배송상태 (status)
- 주문일 (date)

폼 필드:
1. orderNumber (text, 자동생성) - 주문번호
2. customerName (text, 필수) - 주문자
3. customerPhone (tel, 필수) - 연락처
4. shippingAddress (textarea, 필수) - 배송지
5. deliveryStatus (select, 필수) - 배송상태
6. trackingNumber (text) - 송장번호
7. paymentMethod (select, 필수) - 결제수단
8. totalAmount (number, 필수) - 결제금액
```

### 커스터마이징: 주문번호 자동생성

```tsx
const generateOrderNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD${year}${month}${day}${random}`;
};

const [orderNumber, setOrderNumber] = React.useState(
  initialData?.orderNumber ?? generateOrderNumber()
);

<div className="flex items-center gap-4 w-full">
  <div className="flex w-[160px] h-10 py-2 items-center gap-1 shrink-0">
    <span className="text-[#6D6D6D] font-semibold text-xl leading-6">
      주문번호
    </span>
  </div>
  <Input
    type="text"
    value={orderNumber}
    readOnly
    className="flex-1 h-10 bg-gray-100 border-[#EBEBEB]"
  />
</div>
```

## 🎯 공통 패턴

### 1. 목록 → 상세 이동

```tsx
// 목록 페이지에서
<TableRow
  className="cursor-pointer hover:bg-gray-50"
  onClick={() => router.push(`/admin/products/${item.id}`)}
>
```

### 2. 사이드바 메뉴 추가

```tsx
// components/ui/Sidebar/constants.ts
export const menuItems = [
  { label: "상품 관리", href: "/admin/products" },
  { label: "리뷰 관리", href: "/admin/reviews" },
  { label: "이벤트 관리", href: "/admin/events" },
  { label: "회원 관리", href: "/admin/members" },
  { label: "주문 관리", href: "/admin/orders" },
];
```

### 3. Excel 다운로드

```tsx
import * as XLSX from 'xlsx';

const handleExcelDownload = () => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, `${title}_${new Date().toISOString()}.xlsx`);
};
```

## 📚 더 알아보기

- [필드 타입 가이드](./field-types.md)
- [커스터마이징](./customization.md)
- [초기 설정](./setup-guide.md)
