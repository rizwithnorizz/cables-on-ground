type DrumCable = {
  id: string;
  drum_id: string;
  brand: number;
  type: number;
  size: string;
  curr_length: number;
  initial_length: number;
};

type LowStockAlertsProps = {
  alerts: DrumCable[];
};

export function LowStockAlerts({ alerts }: LowStockAlertsProps) {
  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="dark:bg-[#111827]/80 border border-yellow-500/30 rounded-lg p-6 shadow-lg shadow-yellow-500/10">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">⚠️</span>
        <h2 className="font-semibold text-[#111827] dark:text-yellow-400">Low Stock Alerts</h2>
      </div>
      <div className="space-y-2  overflow-x-auto max-h-[50vh]  ">
        {alerts.map((cable) => (
          <div
            key={cable.id}
            className="flex items-center justify-between py-2 border-b dark:border-[#0047FF]/20 border-gray-200 last:border-0"
          >
            <div>
              <p className="darktext-white font-medium">
                {cable.drum_id} · {cable.size}
              </p>
            </div>
            <p className="text-[#111827] dark:text-yellow-400 font-semibold">
              {cable.curr_length}m left →
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
