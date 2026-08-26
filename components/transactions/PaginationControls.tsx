import { Button } from "@/components/ui/button";

type PaginationControlsProps = {
  currentPage: number;
  totalPages: number;
  startIdx: number;
  endIdx: number;
  totalItems: number;
  hasMore: boolean;
  onFirst: () => void;
  onLast: () => void;
  onPrevious: () => void;
  onNext: () => void;
};

export function PaginationControls({
  currentPage,
  totalPages,
  startIdx,
  endIdx,
  totalItems,
  hasMore,
  onFirst,
  onLast,
  onPrevious,
  onNext,
}: PaginationControlsProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-between pb-6 border-b border-[#1f2937] overflow-x-auto">
      <div className="text-sm text-gray-400 whitespace-nowrap">
        Showing {startIdx + 1} to {Math.min(endIdx, totalItems)} of {totalItems}{" "}
        transactions
      </div>
      <div className="flex items-center gap-2 min-w-max">
        <Button
          variant="secondary"
          onClick={onFirst}
          disabled={currentPage === 1}
        >
          First
        </Button>
        <Button
          variant="secondary"
          onClick={onPrevious}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <span className="px-3 py-1 text-sm text-gray-300">Page {currentPage}</span>
        <Button
          variant="secondary"
          onClick={onNext}
          disabled={!hasMore}
        >
          Next
        </Button>
        <Button
          variant="secondary"
          onClick={onLast}
          disabled={!hasMore}
        >
          Last
        </Button>
      </div>
    </div>
  );
}
