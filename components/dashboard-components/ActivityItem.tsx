type ActivityItemProps = {
  type: "cut" | "reserve";
  drumId: string;
  amount: number;
  date: string;
  refNo: string | null;
};

export function ActivityItem({
  type,
  drumId,
  amount,
  date,
  refNo,
}: ActivityItemProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#0047FF]/20 last:border-0">
      <div className="flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            type === "cut" ? "bg-red-500/20" : "bg-emerald-500/20"
          }`}
        >
          <span className="text-sm">{type === "cut" ? "✂️" : "📌"}</span>
        </div>
        <div>
          <p className="text-sm font-medium text-white">
            {drumId}
            {refNo && ` — ${refNo}`}
          </p>
          <p className="text-xs text-gray-500">
            {new Date(date).toLocaleDateString()} ·{" "}
            {new Date(date).toLocaleTimeString()}
          </p>
        </div>
      </div>
      <p
        className={`font-semibold ${
          type === "cut" ? "text-red-400" : "text-emerald-400"
        }`}
      >
        {type === "cut" ? "-" : "Reserved  "}
        {amount}m
      </p>
    </div>
  );
}
