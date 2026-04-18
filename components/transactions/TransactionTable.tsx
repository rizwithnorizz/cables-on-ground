type Transaction = {
  id: string;
  created_at: string;
  drum_id: {
    id: number;
    drum_id: string;
    size: string;
    type: { type_name: string };
    brand: { brand_name: string };
    testcertificate?: string | null;
  };
  length_cut: number;
  balance_cable: number;
  ref_no: string | null;
};

type TransactionTableProps = {
  transactions: Transaction[];
};

export function TransactionTable({ transactions }: TransactionTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b dark:border-[#1f2937]">
            <th className="text-left px-2 py-2 text-xs font-semibold dark:text-gray-400">
              Drum ID
            </th>
            <th className="text-left px-2 py-2 text-xs font-semibold dark:text-gray-400">
              Brand
            </th>
            <th className="text-left px-2 py-2 text-xs font-semibold dark:text-gray-400">
              Type
            </th>
            <th className="text-left px-2 py-2 text-xs font-semibold dark:text-gray-400">
              Size
            </th>
            <th className="text-left px-2 py-2 text-xs font-semibold dark:text-gray-400">
              Original Length (m)
            </th>
            <th className="text-left px-2 py-2 text-xs font-semibold dark:text-gray-400">
              Length Cut (m)
            </th>
            <th className="text-left px-2 py-2 text-xs font-semibold dark:text-gray-400">
              Balance (m)
            </th>
            <th className="text-left px-2 py-2 text-xs font-semibold dark:text-gray-400">
              Date
            </th>
            <th className="text-left px-2 py-2 text-xs font-semibold dark:text-gray-400">
              Test Certificate
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr
              key={tx.id}
              className="border-b dark:border-[#0b1220] hover:bg-blue-200 dark:hover:bg-[#111827] transition "
            >
              <td className="px-2 py-2 dark:text-white">
                {tx.drum_id.drum_id ? (
                  tx.drum_id.drum_id
                ) : (
                  <span className="dark:text-gray-500">
                    Unavailable Drum Number
                  </span>
                )}
              </td>
              <td className="px-2 py-2 dark:text-white">
                {tx.drum_id.brand.brand_name}
              </td>
              <td className="px-2 py-2 dark:text-white">
                {tx.drum_id.type.type_name}
              </td>
              <td className="px-2 py-2 dark:text-white">
                {tx.drum_id.size}
              </td>

              <td className="px-2 py-2 dark:text-white">
                {tx.balance_cable + tx.length_cut} METERS
              </td>
              <td className="px-2 py-2 dark:text-white">
                {tx.length_cut} METERS
              </td>
              <td className="px-2 py-2 dark:text-white">
                {tx.balance_cable} METERS
              </td>
              <td className="px-2 py-2 dark:text-gray-400">
                {new Date(tx.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td className="px-2 py-2">
                {tx.drum_id.testcertificate ? (
                  <a
                    href={tx.drum_id.testcertificate}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dark:text-blue-400 text-blue-800 hover:underline"
                  >
                    View Certificate
                  </a>
                ) : (
                  <span className="text-gray-500">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
