interface Props {
  title: string;
  children: React.ReactNode;
}

export default function Card({
  title,
  children,
}: Props) {
  return (
    <div className="ui-surface p-5 sm:p-6">
      <h2 className="ui-section-title mb-4">
        {title}
      </h2>

      {children}
    </div>
  );
}