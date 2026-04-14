import { Button } from "@/components/ui/button";

type PaginationControlsProps = {
  currentPage: number;
  totalPages: number;
  startIdx: number;
  endIdx: number;
  totalItems: number;
  onPrevious: () => void;
  onNext: () => void;
  onPageChange: (page: number) => void;
};

export function PaginationControls({
  currentPage,
  totalPages,
  startIdx,
  endIdx,
  totalItems,
  onPrevious,
  onNext,
  onPageChange,
}: PaginationControlsProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-between pt-6 border-t border-[#1f2937]">
      <div className="text-sm text-gray-400">
        Showing {startIdx + 1} to {Math.min(endIdx, totalItems)} of {totalItems}{" "}
        transactions
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          onClick={onPrevious}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-3 py-1 rounded text-sm transition ${
                currentPage === page
                  ? "bg-blue-500 text-white"
                  : "bg-[#1f2937] text-gray-300 hover:bg-[#2d3748]"
              }`}
            >
              {page}
            </button>
          ))}
        </div>
        <Button
          variant="secondary"
          onClick={onNext}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
