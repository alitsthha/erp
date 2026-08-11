type Props = {
  status: string;
};

export default function StaffStatusBadge({
  status,
}: Props) {
  const colors = {
    Active: "bg-green-100 text-green-700",
    Inactive: "bg-gray-100 text-gray-700",
    Resigned: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-sm font-medium ${
        colors[status as keyof typeof colors] ??
        "bg-gray-100 text-gray-700"
      }`}
    >
      {status}
    </span>
  );
}