interface Props {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

export default function FormField({
  label,
  required,
  children,
}: Props) {
  return (
    <div className="space-y-2">
      <label className="font-medium text-gray-700">
        {label}

        {required && (
          <span className="text-red-500 ml-1">*</span>
        )}
      </label>

      {children}
    </div>
  );
}