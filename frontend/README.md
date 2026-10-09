# Next.js Admin Master Template

> 재사용 가능한 관리자 페이지 마스터 파일 - 상품, 회원, 주문 등 모든 관리 모듈을 빠르게 구축

[![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

## 📋 목차

- [개요](#-개요)
- [주요 기능](#-주요-기능)
- [기술 스택](#-기술-스택)
- [빠른 시작](#-빠른-시작)
- [프로젝트 구조](#-프로젝트-구조)
- [Claude Code 스킬](#-claude-code-스킬)
- [컴포넌트 시스템](#-컴포넌트-시스템)
- [페이지 추가하기](#-페이지-추가하기)
- [디자인 시스템](#-디자인-시스템)
- [커스터마이징](#-커스터마이징)

---

## 🎯 개요

**Next.js Admin Master Template**은 모던 관리자 페이지를 빠르게 구축할 수 있는 프로덕션 레디 템플릿입니다.

### 특징

- ✅ **자동 생성**: Claude Code 스킬로 CRUD 페이지를 3분 내 자동 생성
- ✅ **일관된 디자인**: Radix UI + Tailwind CSS 기반 통일된 디자인 시스템
- ✅ **한국어 최적화**: Pretendard 폰트, 한국 날짜 포맷 지원
- ✅ **접근성 우선**: WCAG 준수 Radix UI 컴포넌트
- ✅ **재사용 가능**: 모듈화된 컴포넌트, 훅, 레이아웃
- ✅ **프로덕션 레디**: TypeScript, ESLint, 최신 Next.js 16+ 기반

### 사용 사례

이 템플릿으로 다음과 같은 관리자 페이지를 쉽게 만들 수 있습니다:

- 🛒 **커머스 관리자**: 상품, 주문, 회원, 리뷰 관리
- 📚 **콘텐츠 관리자**: 블로그, 뉴스, 이벤트 관리
- 👥 **회원 관리자**: 사용자, 권한, 포인트 관리
- 📊 **데이터 대시보드**: 통계, 리포트, 로그 관리

---

## ✨ 주요 기능

### 관리자 페이지 핵심 기능

- **목록 페이지**
  - 고급 필터링 (날짜 범위, 상태, 카테고리)
  - 다중 조건 검색
  - 테이블 정렬 및 페이지네이션
  - Excel/CSV 다운로드

- **폼 페이지**
  - 신규 등록 / 수정 / 삭제
  - 유효성 검사 (React Hook Form + Zod)
  - 모달 확인 대화상자
  - 토스트 알림 (성공/실패)

- **레이아웃**
  - 상단 헤더 (로고, 프로필)
  - 좌측 사이드바 (메뉴 네비게이션)
  - 접기/펼치기 서브메뉴
  - 반응형 디자인

### 내장 페이지

현재 구현된 관리 모듈:

| 모듈 | 경로 | 기능 |
|------|------|------|
| 회원 관리 | `/admin/members` | 회원 목록, 등록, 수정, 삭제 |
| 프로그램 목록 | `/admin/programs/list` | 프로그램 목록, 등록, 수정 |
| 프로그램 관리 | `/admin/programs/manage` | 프로그램 관리 페이지 |

---

## 🛠 기술 스택

### 프레임워크 & 언어

- **Next.js 16.1** - App Router 기반 React 프레임워크
- **React 19.2** - 최신 React (Server Components 지원)
- **TypeScript 5** - 정적 타입 체크

### UI & 스타일링

- **Tailwind CSS 4** - 유틸리티 우선 CSS 프레임워크
- **Radix UI** - 접근성 우선 헤드리스 컴포넌트
  - Avatar, Checkbox, Dropdown, Label, Popover, Select 등
- **CVA (Class Variance Authority)** - 컴포넌트 스타일 변형 관리
- **Lucide React** - 540+ 아이콘 라이브러리

### 기능성 라이브러리

- **date-fns 4.1** - 날짜 포맷팅 (한국어 로케일)
- **react-day-picker 9.13** - 날짜 선택 컴포넌트
- **Sonner 1.7** - 토스트 알림
- **clsx + tailwind-merge** - 클래스명 조건부 병합

### 개발 도구

- **ESLint 9** - 코드 린팅
- **PostCSS** - Tailwind CSS 처리

---

## 🚀 빠른 시작

### 1. 설치

```bash
# 저장소 클론
git clone <repository-url>
cd 186.nextjs_admin_master

# 의존성 설치
npm install
```

### 2. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

### 3. 빌드 및 배포

```bash
# 프로덕션 빌드
npm run build

# 프로덕션 서버 시작
npm start
```

### 4. 첫 페이지 생성 (Claude Code 사용)

```bash
# Claude Code 스킬 실행
/admin-generator
```

대화형으로 다음 정보를 입력:
- **모듈명**: `products` (영문 소문자)
- **제목**: `상품` (한글)
- **경로**: `/admin/products`
- **테이블 컬럼**: 상품명, 가격, 재고 등
- **폼 필드**: 입력 필드 정의

3분 내에 완성된 CRUD 페이지가 생성됩니다!

---

## 📁 프로젝트 구조

```
d:\000.FrontEnd\186.nextjs_admin_master/
├── app/                                    # Next.js App Router
│   ├── layout.tsx                         # 루트 레이아웃
│   ├── page.tsx                           # 홈페이지
│   ├── globals.css                        # 전역 스타일
│   ├── admin/                             # 관리자 영역
│   │   ├── layout.tsx                     # Admin 레이아웃
│   │   ├── login/                         # 로그인
│   │   └── (main)/                        # 인증된 페이지 그룹
│   │       ├── layout.tsx                 # Header + Sidebar
│   │       ├── members/                   # 회원 관리
│   │       │   ├── page.tsx               # 목록
│   │       │   ├── new/page.tsx           # 신규 등록
│   │       │   ├── [id]/page.tsx          # 상세/수정
│   │       │   └── components/
│   │       │       └── MemberForm.tsx     # 폼 컴포넌트
│   │       └── programs/                  # 프로그램 관리
│   │           ├── list/                  # 목록
│   │           └── manage/                # 관리
│   └── calendar-demo/                     # 데모 페이지
│
├── components/                            # React 컴포넌트
│   ├── ui/                               # UI 컴포넌트 시스템
│   │   ├── Avatar/                       # 프로필 아바타
│   │   ├── Badge/                        # 상태 배지
│   │   ├── Button/                       # 버튼 (variant: default, outline, destructive 등)
│   │   ├── Calendar/                     # 날짜 선택
│   │   ├── Checkbox/                     # 체크박스
│   │   ├── Header/                       # 상단 헤더
│   │   ├── Input/                        # 입력 필드
│   │   ├── Label/                        # 레이블
│   │   ├── Modal/                        # 확인 모달
│   │   ├── Pagination/                   # 페이지네이션
│   │   ├── Select/                       # 드롭다운
│   │   ├── Sidebar/                      # 좌측 사이드바
│   │   │   ├── Sidebar.tsx
│   │   │   └── constants.ts              # 메뉴 구조
│   │   ├── Table/                        # 테이블 시스템
│   │   ├── Textarea/                     # 텍스트 영역
│   │   └── Toast/                        # 토스트 알림
│   │
│   └── hooks/                            # 커스텀 훅
│       ├── useScrollUp.ts               # 스크롤 상단 이동
│       ├── useModal.ts                  # 모달 상태 관리
│       └── useToast.ts                  # 토스트 알림
│
├── lib/                                  # 유틸리티
│   └── utils.ts                         # cn() 함수 (클래스 병합)
│
├── .claude/                              # Claude Code 스킬 ⭐
│   └── skills/
│       ├── admin-generator/              # CRUD 페이지 자동 생성
│       │   ├── skill.clc                # 메타데이터
│       │   ├── SKILL.md                 # 실행 지침
│       │   ├── README.md                # 사용자 문서
│       │   ├── scripts/                 # 템플릿 파일
│       │   │   ├── list-page.template.tsx
│       │   │   └── form.template.tsx
│       │   └── references/              # 참고 문서
│       │       ├── setup-guide.md       # 초기 설정
│       │       ├── field-types.md       # 필드 타입
│       │       ├── customization.md     # 커스터마이징
│       │       └── examples.md          # 실전 예제
│       │
│       └── ncp-sms-auth/                # NCP SMS 인증
│           ├── skill.clc
│           ├── SKILL.md
│           ├── README.md
│           ├── scripts/                 # Edge Function 및 컴포넌트
│           └── references/              # 참고 문서
│
├── public/                               # 정적 자산
│   ├── logo.png
│   └── profile.svg
│
├── next.config.js                        # Next.js 설정
├── tailwind.config.ts                    # Tailwind CSS 설정
├── postcss.config.js                     # PostCSS 설정
├── components.json                       # shadcn/ui CLI 설정
├── package.json                          # npm 의존성
└── tsconfig.json                         # TypeScript 설정
```

---

## 🤖 Claude Code 스킬

이 프로젝트는 **Claude Code 스킬**을 통해 자동화된 개발 워크플로우를 제공합니다.

### 1. admin-generator 스킬 ⭐

**목적**: 관리자 페이지 CRUD 구조를 3분 내 자동 생성

#### 사용법

```bash
/admin-generator
```

#### 생성 과정

1. **모듈 정보 입력**
   - 모듈명: `products`
   - 제목: `상품`
   - 경로: `/admin/products`

2. **테이블 컬럼 정의**
   - 상품명, 가격, 재고, 카테고리 등

3. **폼 필드 정의**
   - 입력 타입 (text, number, select, textarea 등)
   - 필수 여부
   - 기본값

4. **자동 생성**
   ```
   app/admin/(main)/products/
   ├── page.tsx                    # 목록 페이지
   ├── components/
   │   └── ProductsForm.tsx       # 폼 컴포넌트
   ├── new/
   │   └── page.tsx               # 신규 등록
   └── [id]/
       └── page.tsx               # 상세/수정
   ```

#### 생성되는 기능

- ✅ 목록 페이지 (필터, 검색, 테이블, 실제 페이지네이션)
- ✅ 신규 등록 페이지
- ✅ 상세/수정 페이지
- ✅ 삭제 기능 (모달 확인)
- ✅ 토스트 알림
- ✅ **Sidebar 메뉴 자동 추가** ⭐
- ✅ programs/manage 기반 검증된 구조

#### 문서

- [SKILL.md](.claude/skills/admin-generator/SKILL.md) - 실행 지침
- [README.md](.claude/skills/admin-generator/README.md) - 사용 가이드
- [references/setup-guide.md](.claude/skills/admin-generator/references/setup-guide.md) - 초기 설정
- [references/field-types.md](.claude/skills/admin-generator/references/field-types.md) - 필드 타입
- [references/customization.md](.claude/skills/admin-generator/references/customization.md) - 커스터마이징
- [references/examples.md](.claude/skills/admin-generator/references/examples.md) - 실전 예제

### 2. ncp-sms-auth 스킬 ⭐

**목적**: NCP SENS를 이용한 SMS 인증 시스템 통합

#### 사용법

```bash
/ncp-sms-auth
```

#### 기능

- 📱 휴대폰 번호 인증
- 🔐 OTP 코드 검증 (6자리)
- ⏱️ 3분 만료 시간
- 🔄 재전송 기능
- 🗄️ Supabase 저장소 연동

#### 문서

- [SKILL.md](.claude/skills/ncp-sms-auth/SKILL.md) - 실행 지침
- [README.md](.claude/skills/ncp-sms-auth/README.md) - 사용 가이드

---

## 🧩 컴포넌트 시스템

### UI 컴포넌트 (components/ui/)

모든 UI 컴포넌트는 **Radix UI + Tailwind CSS + CVA** 패턴을 사용합니다.

#### Button

```tsx
import { Button } from "@/components/ui/Button";

// Variants
<Button variant="default">기본</Button>
<Button variant="outline">아웃라인</Button>
<Button variant="destructive">삭제</Button>
<Button variant="secondary">보조</Button>
<Button variant="ghost">고스트</Button>
<Button variant="link">링크</Button>

// Sizes
<Button size="default">기본</Button>
<Button size="sm">작게</Button>
<Button size="lg">크게</Button>
<Button size="icon">아이콘</Button>
```

#### Input

```tsx
import { Input } from "@/components/ui/Input";

<Input type="text" placeholder="입력해주세요" />
<Input type="email" placeholder="이메일" />
<Input type="number" placeholder="숫자" />
<Input type="tel" placeholder="전화번호" />
```

#### Select

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";

<Select defaultValue="all">
  <SelectTrigger className="w-[200px]">
    <SelectValue placeholder="선택" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">전체</SelectItem>
    <SelectItem value="active">활성</SelectItem>
    <SelectItem value="inactive">비활성</SelectItem>
  </SelectContent>
</Select>
```

#### Table

```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>No</TableHead>
      <TableHead>이름</TableHead>
      <TableHead>이메일</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {data.map((item, index) => (
      <TableRow key={item.id}>
        <TableCell>{index + 1}</TableCell>
        <TableCell>{item.name}</TableCell>
        <TableCell>{item.email}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

#### Modal

```tsx
import { Modal } from "@/components/ui/Modal";
import { useModal } from "@/components/hooks/useModal";

const { isOpen, config, isLoading, openModal, closeModal, handleConfirm } = useModal();

// 모달 열기
openModal({
  title: "삭제 확인",
  message: "정말로 삭제하시겠습니까?",
  onConfirm: async () => {
    await deleteItem(id);
  }
});

// 모달 렌더링
<Modal
  isOpen={isOpen}
  title={config?.title || ""}
  message={config?.message || ""}
  onConfirm={handleConfirm}
  onCancel={closeModal}
  isLoading={isLoading}
/>
```

### 커스텀 훅 (components/hooks/)

#### useScrollUp

라우트 변경 시 페이지를 자동으로 상단으로 스크롤합니다.

```tsx
import { useScrollUp } from "@/components/hooks/useScrollUp";

const router = useScrollUp();

// 페이지 이동 시 자동으로 상단 스크롤
router.push("/admin/members");
router.back();
```

#### useModal

모달 상태를 관리합니다.

```tsx
import { useModal } from "@/components/hooks/useModal";

const { openModal, closeModal } = useModal();

const handleDelete = () => {
  openModal({
    title: "삭제 확인",
    message: "정말로 삭제하시겠습니까?",
    onConfirm: async () => {
      // 삭제 로직
    }
  });
};
```

#### useToast

토스트 알림을 표시합니다.

```tsx
import { useToast } from "@/components/hooks/useToast";

const { success, error } = useToast();

// 성공
success("회원이 등록되었습니다.");

// 실패
error("저장에 실패했습니다.");
```

---

## 📄 페이지 추가하기

### 방법 1: Claude Code 스킬 사용 (추천)

```bash
# admin-generator 스킬 실행
/admin-generator

# 입력 예시
모듈명: products
제목: 상품
경로: /admin/products
```

3분 내에 완성된 CRUD 페이지가 생성됩니다!

### 방법 2: 수동 생성

기존 페이지 (예: `members/`)를 복사하여 수정하는 방법도 가능합니다.

자세한 내용은 [admin-generator 문서](.claude/skills/admin-generator/README.md)를 참고하세요.

---

## 🎨 디자인 시스템

### 색상 팔레트

| 용도 | 색상 | 변수 | 클래스 |
|------|------|------|--------|
| 주요 색상 | `#08F` | `--primary-color` | `text-primary`, `bg-primary` |
| 배경 | `#FFFFFF` | `--color-background` | `bg-white` |
| 배경 (대체) | `#F3F2F0` | - | `bg-[#F3F2F0]` |
| 텍스트 (강조) | `#2A2A2A` | `--gray-01` | `text-[#2A2A2A]` |
| 텍스트 (일반) | `#555` | `--gray-02` | `text-[#555]` |
| 텍스트 (부가) | `#6D6D6D` | `--gray-03` | `text-[#6D6D6D]` |
| 테두리 | `#EBEBEB` | `--color-border` | `border-[#EBEBEB]` |
| 테두리 (밝음) | `#E5E5E5` | - | `border-[#E5E5E5]` |
| 플레이스홀더 | `#E3E3E3` | - | `placeholder:text-[#E3E3E3]` |
| 필수 필드 | `#D65856` | - | `text-[#D65856]` |
| 성공 | `#4CA452` | - | `text-green-600` |

### 타이포그래피

- **폰트 패밀리**: Pretendard (한글 최적화), -apple-system, Roboto
- **제목 (h1)**: `text-2xl font-semibold` (24px, 600)
- **라벨**: `text-xl font-semibold` (20px, 600)
- **본문**: `text-sm font-medium` (14px, 500)
- **보조**: `text-xs` (12px)

### 간격 시스템

- **컨테이너 패딩**: `p-8` (32px), `p-11` (44px)
- **컴포넌트 간격**: `gap-4` (16px), `gap-6` (24px)
- **버튼 높이**: `h-10` (40px)
- **입력 필드 높이**: `h-10` (40px)
- **라벨 너비**: `w-[160px]` (160px)

---

## 🔧 커스터마이징

### 색상 변경

```css
/* app/globals.css */
:root {
  --primary-color: #FF6B00; /* 주황색으로 변경 */
}

@theme {
  --color-primary: hsl(24 100% 50%);
}
```

### 사이드바 메뉴 추가

```tsx
// components/ui/Sidebar/constants.ts
export const menuSections = [
  {
    header: "관리",
    items: [
      { label: "회원 관리", href: "/admin/members" },
      { label: "상품 관리", href: "/admin/products" }, // 추가
      // ...
    ],
  },
];
```

자세한 커스터마이징 가이드는 [customization.md](.claude/skills/admin-generator/references/customization.md)를 참고하세요.

---

## 📚 참고 문서

### Claude Code 스킬

- [admin-generator 스킬 가이드](.claude/skills/admin-generator/README.md)
  - [초기 설정](.claude/skills/admin-generator/references/setup-guide.md)
  - [필드 타입](.claude/skills/admin-generator/references/field-types.md)
  - [커스터마이징](.claude/skills/admin-generator/references/customization.md)
  - [실전 예제](.claude/skills/admin-generator/references/examples.md)

- [ncp-sms-auth 스킬 가이드](.claude/skills/ncp-sms-auth/README.md)

### 외부 문서

- [Next.js 공식 문서](https://nextjs.org/docs)
- [React 공식 문서](https://react.dev/)
- [Tailwind CSS 공식 문서](https://tailwindcss.com/docs)
- [Radix UI 공식 문서](https://www.radix-ui.com/)
- [Lucide 아이콘](https://lucide.dev/)

---

## 🤝 기여

이슈 및 풀 리퀘스트는 언제든 환영합니다!

---

## 📄 라이선스

MIT License

---

## 💡 팁

### 1. 빠른 페이지 추가

```bash
# Claude Code 스킬 사용
/admin-generator

# 입력: products, 상품, /admin/products
# 3분 내 CRUD 페이지 완성
```

### 2. 사이드바 메뉴 추가

```tsx
// components/ui/Sidebar/constants.ts
{ label: "상품 관리", href: "/admin/products" }
```

### 3. 데이터 연동

```tsx
// API Route 생성
// app/api/products/route.ts
export async function GET() {
  const data = await fetchProducts();
  return Response.json(data);
}

// 페이지에서 사용
useEffect(() => {
  fetch("/api/products")
    .then(res => res.json())
    .then(setData);
}, []);
```

### 4. 유효성 검사

```bash
npm install react-hook-form zod @hookform/resolvers
```

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const schema = z.object({
  name: z.string().min(1, "필수 입력"),
  price: z.number().min(0, "0 이상"),
});

const form = useForm({ resolver: zodResolver(schema) });
```

---

**관리자 페이지를 3분 내에 시작하세요!** 🚀

Claude Code 스킬을 사용하면 CRUD 페이지를 빠르게 생성하고, 일관된 디자인으로 프로덕션 레디 관리자 페이지를 만들 수 있습니다.
