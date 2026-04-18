import Link from "next/link";
import { ActivityItem } from "./ActivityItem";

type Activity = {
  id: string | bigint;
  type: "cut" | "reserve";
  drum_id: string;
  amount: number;
  date: string;
  ref_no: string | null;
};

type RecentActivityProps = {
  activities: Activity[];
};

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="bg-white dark:bg-[#111827]/80 border dark:border-[#0047FF]/30 border-gray-200 rounded-lg p-6 shadow-lg dark:shadow-[#0047FF]/10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-foreground dark:text-white">Recent Activity</h2>
        <Link href="/transactions">
          <p className="text-blue-500 dark:text-[#00C8FF] text-sm font-medium hover:text-blue-600 dark:hover:text-[#0047FF] transition-colors">
            View all
          </p>
        </Link>
      </div>
      <div className="space-y-4">
        {activities.length === 0 ? (
          <p className="text-gray-500 text-sm">No recent activity</p>
        ) : (
          activities.map((activity) => (
            <ActivityItem
              key={activity.id}
              type={activity.type}
              drumId={activity.drum_id}
              amount={activity.amount}
              date={activity.date}
              refNo={activity.ref_no}
            />
          ))
        )}
      </div>
    </div>
  );
}
