import { CableCard } from "./CableCard";

type DrumCable = {
  id: bigint;
  drum_id: string;
  brand: number | string;
  type: number | string;
  size: string;
  reserved: boolean;
  curr_length: number;
  initial_length: number;
  testcertificate?: string | null;
  disabled: boolean;
};

type DrumsGridProps = {
  filteredCablesBySize: Record<string, DrumCable[]>;
  numericSizeSort: (a: string, b: string) => number;
  onSelectCable: (cable: DrumCable) => void;
};

export function DrumsGrid({
  filteredCablesBySize,
  numericSizeSort,
  onSelectCable,
}: DrumsGridProps) {
  const sizes = Object.keys(filteredCablesBySize).sort(numericSizeSort);

  if (sizes.length === 0) {
    return (
      <div className="text-center text-gray-600 dark:text-gray-400 py-8">
        No drums found matching the selected filters
      </div>
    );
  }

  return (
    <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
      <table className="border-collapse sticky top-0">
        <thead className="sticky top-0 z-20 dark:bg-[#111827]/30 backdrop-blur-sm">
          <tr>
            {sizes.map((size) => (
              <th key={size}>
                <div className="mx-2 my-1 text-center text-2xl font-semibold text-gray-700 dark:text-gray-300 shadow-inner dark:shadow-[#0047FF] shadow-blue-200 dark:bg-[#1a1f3a] bg-gray-100 rounded-lg">
                  {size}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from(
            {
              length: Math.max(
                ...Object.values(filteredCablesBySize).map(
                  (cables) => cables.length
                )
              ),
            },
            (_, rowIndex) => (
              <tr
                key={rowIndex}
                className="divide-x dark:divide-[#0047FF]/30 divide-gray-300"
              >
                {sizes.map((size) => {
                  const cable = filteredCablesBySize[size][rowIndex];
                  return (
                    <td
                      key={size}
                      className="px-4 py-1 min-w-[10rem] align-top"
                    >
                      <CableCard
                        cable={cable || null}
                        onSelect={onSelectCable}
                      />
                    </td>
                  );
                })}
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}
