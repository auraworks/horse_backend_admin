# Admin Generator - 초기 설정 가이드

## 📋 요구사항

Admin Generator를 사용하기 전에 다음 요구사항이 충족되어야 합니다.

### 필수 요구사항

- **Next.js 14+** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui** 컴포넌트

### 필수 shadcn/ui 컴포넌트

다음 컴포넌트들이 설치되어 있어야 합니다:

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add select
npx shadcn-ui@latest add checkbox
npx shadcn-ui@latest add label
npx shadcn-ui@latest add table
npx shadcn-ui@latest add calendar
```

## 🎨 디자인 시스템

### 색상 팔레트

Admin Generator는 다음 색상을 사용합니다:

```css
/* Primary Color */
--primary: #08F;

/* Background Colors */
--bg-main: #F3F2F0;
--bg-white: #FFFFFF;

/* Text Colors */
--text-primary: #2A2A2A;
--text-secondary: #6D6D6D;
--text-tertiary: #0A0A0A;

/* Border Colors */
--border-default: #EBEBEB;
--border-light: #E5E5E5;

/* Placeholder */
--placeholder: #E3E3E3;

/* Required Field */
--required: #D65856;
```

### Tailwind 설정

`tailwind.config.ts`에 다음 설정이 필요합니다:

```typescript
export default {
  theme: {
    extend: {
      colors: {
        primary: "#08F",
        // ... 기타 색상
      },
    },
  },
};
```

## 📁 프로젝트 구조

Admin Generator가 생성하는 파일들이 위치할 디렉토리 구조:

```
app/
└── admin/
    └── (main)/              # Route Group
        ├── members/         # 회원 관리
        ├── programs/        # 프로그램 관리
        └── {module}/        # 새로 생성될 모듈
            ├── page.tsx     # 목록 페이지
            ├── components/
            │   └── {Module}Form.tsx
            ├── new/
            │   └── page.tsx
            └── [id]/
                └── page.tsx
```

## 🔧 필수 커스텀 훅

### useScrollUp Hook

페이지 이동 시 스크롤을 맨 위로 올리는 훅이 필요합니다:

```typescript
// components/hooks/useScrollUp.ts
import { useRouter } from "next/navigation";

export function useScrollUp() {
  const router = useRouter();

  return {
    ...router,
    back: () => {
      window.scrollTo(0, 0);
      router.back();
    },
    push: (href: string) => {
      window.scrollTo(0, 0);
      router.push(href);
    },
  };
}
```

## ✅ 설정 확인

다음 체크리스트를 확인하세요:

- [ ] Next.js 14+ 설치됨
- [ ] TypeScript 설정됨
- [ ] Tailwind CSS 설정됨
- [ ] shadcn/ui 컴포넌트 설치됨
- [ ] `app/admin/(main)/` 디렉토리 존재
- [ ] `useScrollUp` 훅 생성됨
- [ ] 색상 팔레트 Tailwind에 추가됨

## 🚀 첫 모듈 생성

설정이 완료되면 다음 명령어로 첫 모듈을 생성할 수 있습니다:

```bash
/admin-generator
```

예제: 상품 관리 페이지 생성

```
모듈명: products
제목: 상품
경로: /admin/products
```

생성 후 사이드바 메뉴에 추가:

```typescript
// components/ui/Sidebar/constants.ts
export const menuItems = [
  // ... 기존 메뉴
  { label: "상품 관리", href: "/admin/products" },
];
```

## 🔍 트러블슈팅

### 컴포넌트 import 에러

```
Module not found: Can't resolve '@/components/ui/Button'
```

**해결**: shadcn/ui 컴포넌트를 설치하세요:

```bash
npx shadcn-ui@latest add button
```

### 스타일 미적용

**해결**: Tailwind CSS 설정 확인 및 색상 팔레트 추가

### 라우팅 에러

**해결**: `app/admin/(main)/` Route Group 구조 확인

## 📚 다음 단계

- [필드 타입 가이드](./field-types.md) - 다양한 필드 타입 사용법
- [커스터마이징](./customization.md) - 생성된 페이지 수정
- [예제](./examples.md) - 실전 예제
