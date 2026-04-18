import Link from "next/link";

type StockItem = {
  name: string;
  length: number;
};

type StockByTypeProps = {
  items: StockItem[];
  maxLength: number;
};

export function StockByType({ items, maxLength }: StockByTypeProps) {
  return (
    <div className="bg-white dark:bg-[#111827]/80 border dark:border-[#0047FF]/30 border-gray-200 rounded-lg p-6 shadow-lg dark:shadow-[#0047FF]/10">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
        Stock by Cable Type (meters)
      </h2>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.name}>
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {item.name}
              </p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {item.length}m
              </p>
            </div>
            <div className="w-full bg-gray-300 dark:bg-[#0b1220] rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 dark:from-[#0047FF] to-blue-400 dark:to-[#00C8FF] h-2 rounded-full"
                style={{
                  width: `${(item.length / maxLength) * 100}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <Link href="/cables_view">
        <p className="text-blue-500 dark:text-[#00C8FF] text-sm font-medium mt-6 hover:text-blue-600 dark:hover:text-[#0047FF] transition-colors">
          View full breakdown →
        </p>
      </Link>
    </div>
  );
}
