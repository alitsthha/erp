interface Props {
  title: string;
  children: React.ReactNode;
}

export default function Card({
  title,
  children,
}: Props) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-xl font-semibold mb-6">
        {title}
      </h2>

      {children}
    </div>
  );
}