type StatCard = {
  label: string;
  value: string | number;
  subtext: string;
  emoji: string;
  borderColor: string;
  shadowColor: string;
};

type StatsGridProps = {
  stats: StatCard[];
};

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className={`bg-white dark:bg-[#111827]/80 border rounded-lg p-6 shadow-lg dark:shadow-lg ${stat.borderColor.replace('border-', 'dark:border-')} ${stat.shadowColor}`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stat.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{stat.subtext}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
