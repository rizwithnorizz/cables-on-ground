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
      <div className="text-gray-500 text-xs italic h-full flex items-center">
        —
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(cable)}
      className={`space-y-6 bg-[#111827]/80 border border-[#0047FF]/30 rounded-3xl shadow-lg ${
        cable.reserved ? "shadow-[#FFFF00]/50" : "shadow-[#0047FF]/10"
      } w-full h-full p-4 flex flex-col items-center justify-center transition-transform hover:scale-[1.02]`}
    >
      <div className="text-lg items-center flex justify-center">
        {cable.curr_length} M
      </div>
    </button>
  );
}
