import { useEffect } from "react";
import { useRouter } from "next/navigation";

export const useScrollUp = () => {
  const router = useRouter();

  useEffect(() => {
    const handleRouteChange = () => {
      window.scrollTo(0, 0);
    };

    const originalPush = router.push;
    router.push = function (...args) {
      handleRouteChange();
      return originalPush.apply(this, args);
    };

    return () => {
      router.push = originalPush;
    };
  }, [router]);

  return router;
};
