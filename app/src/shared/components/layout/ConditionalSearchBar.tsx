"use client";

import { usePathname } from "next/navigation";
import { useRef, useEffect } from "react";
import HomeSearchBar, { type HomeSearchBarRef } from "./HomeSearchBar";

export default function ConditionalSearchBar() {
  const pathname = usePathname();
  const searchBarRef = useRef<HomeSearchBarRef>(null);
  
  // 只在首页(/)和搜索页(/search)显示
  const shouldShow = pathname === "/" || pathname === "/search";
  
  // 监听 / 键，聚焦搜索框（只在首页和 search 路由）
  useEffect(() => {
    if (!shouldShow) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果焦点在输入框内，不响应
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        searchBarRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shouldShow]);
  
  if (!shouldShow) {
    // 不显示搜索框时，保留与NavBar相同的上边距
    return <div className="mt-[60px] md:mt-[64px]" />;
  }
  
  return <HomeSearchBar ref={searchBarRef} />;
}
