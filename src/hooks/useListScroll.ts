import { useLayoutEffect, type RefObject } from "react";

export function useListScroll(container: RefObject<HTMLElement | null>, pathname: string) {
  useLayoutEffect(() => {
    const element = container.current;
    if (!element) return;
    const key = `erp:ui:${pathname}:scroll`;
    let target = 0;
    try { target = Number(sessionStorage.getItem(key)) || 0; } catch { /* Optional preference. */ }
    let restoring = true;
    const restore = () => {
      if (!restoring) return;
      element.scrollTo({ top: target, behavior: "instant" });
      if (element.scrollTop >= target) restoring = false;
    };
    const save = () => {
      if (!restoring) {
        try { sessionStorage.setItem(key, String(element.scrollTop)); } catch { /* Optional preference. */ }
      }
    };
    const interact = () => { restoring = false; };
    const observer = new ResizeObserver(restore);
    if (element.firstElementChild) observer.observe(element.firstElementChild);
    restore();
    element.addEventListener("scroll", save);
    element.addEventListener("wheel", interact);
    element.addEventListener("touchstart", interact);
    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", save);
      element.removeEventListener("wheel", interact);
      element.removeEventListener("touchstart", interact);
    };
  }, [container, pathname]);
}
