interface CardContentProps {
  title: string;
  children: React.ReactNode;
}

export default function CardContent({
  title,
  children,
}: CardContentProps) {
  return (
    <div className="ui-surface">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="ui-section-title">
          {title}
        </h2>
      </div>

      <div className="p-6">
        {children}
      </div>
    </div>
  );
}