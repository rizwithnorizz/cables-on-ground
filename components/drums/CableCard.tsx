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
  partial_reserved: boolean;
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
      className={`space-y-2 dark:bg-[#111827]/80 dark:border-[#0047FF]/30 border-gray-200 border-2 rounded-lg rounded-b-none shadow-lg ${
        cable.reserved ? (cable.partial_reserved ? "border-yellow-500 dark:border-yellow-500 border-2" : "bg-yellow-500  dark:bg-yellow-500 dark:border-transparent") : "dark:shadow-[#0047FF]/10"
      } ${
        !cable.testcertificate ? "border-l-red-500 dark:border-l-red-500 border-l-8 rounded-l-none" : " "
      } w-full h-full p-4 flex flex-col items-center justify-center transition-transform hover:scale-[1.02]
      ${cable.disabled ? "opacity-50 border-lg border-red-500 border-2" : "cursor-pointer"}
      `}
      title={cable.disabled ? "This cable is disabled" : ""}
      
    >
      <div className={`text-sm items-center flex justify-center text-foreground ${cable.reserved ? "dark:text-white" : ""}`}>
        {cable.curr_length} M
      </div>
    </button>
  );
}
