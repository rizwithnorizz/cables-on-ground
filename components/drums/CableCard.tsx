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
};

type CableCardProps = {
  cable: DrumCable | null;
  onSelect: (cable: DrumCable) => void;
};

export function CableCard({ cable, onSelect }: CableCardProps) {
  if (!cable) {
    return (
      <div className="text-gray-400 dark:text-gray-500 text-xs italic h-full flex items-center">
        —
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(cable)}
      className={`space-y-2 bg-white dark:bg-[#111827]/80 border dark:border-[#0047FF]/30 border-gray-200 rounded-lg shadow-lg ${
        cable.reserved ? "bg-green-400 shadow-green-200 dark:shadow-[#00FF00]/50" : "dark:shadow-[#0047FF]/10"
      } w-full h-full p-4 flex flex-col items-center justify-center transition-transform hover:scale-[1.02]`}
    >
      <div className={`text-sm items-center flex justify-center text-foreground ${cable.reserved ? "text-white" : ""}`}>
        {cable.curr_length} M
      </div>
    </button>
  );
}
