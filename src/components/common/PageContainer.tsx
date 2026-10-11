import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={`ui-page min-h-full ${className || ''}`}>
      <div className="ui-page">{children}</div>
    </div>
  );
}
