import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={`min-h-full bg-slate-50 px-4 py-6 sm:px-6 lg:px-8 ${className || ''}`}>
      <div className="mx-auto w-full max-w-7xl">{children}</div>
    </div>
  );
}
