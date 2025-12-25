'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname } from 'next/navigation';

type SwipePage = {
  id: string;
  path: string;
  content: ReactNode;
};

type SwipeContainerProps = {
  pages: SwipePage[];
};

export default function SwipeContainer({ pages }: SwipeContainerProps) {
  const pathname = usePathname();
  
  // 找到当前路径对应的页面
  const currentPage = pages.find(page => pathname.startsWith(page.path)) || pages[0];

  return (
    <div className="relative w-full h-full">
      {currentPage.content}
    </div>
  );
}