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

  // Generate page numbers to display (with ellipsis for large ranges)
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const range = 2; // pages to show on each side of current page
    
    // Always show first page
    pages.push(1);
    
    // Add ellipsis if there's a gap after first page
    if (currentPage - range > 2) {
      pages.push("...");
    }
    
    // Add pages around current page
    for (let i = Math.max(2, currentPage - range); i <= Math.min(totalPages - 1, currentPage + range); i++) {
      if (!pages.includes(i)) {
        pages.push(i);
      }
    }
    
    // Add ellipsis if there's a gap before last page
    if (currentPage + range < totalPages - 1) {
      pages.push("...");
    }
    
    // Always show last page (if more than 1 page)
    if (totalPages > 1 && !pages.includes(totalPages)) {
      pages.push(totalPages);
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-between pb-6 border-b border-[#1f2937] overflow-x-auto">
      <div className="text-sm text-gray-400 whitespace-nowrap">
        Showing {startIdx + 1} to {Math.min(endIdx, totalItems)} of {totalItems}{" "}
        transactions
      </div>
      <div className="flex items-center gap-2 min-w-max">
        <Button
          variant="secondary"
          onClick={onPrevious}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <div className="flex items-center gap-1">
          {pageNumbers.map((page, index) => (
            <button
              key={`${page}-${index}`}
              onClick={() => typeof page === "number" && onPageChange(page)}
              disabled={page === "..."}
              className={`px-3 py-1 rounded text-sm transition ${
                page === "..."
                  ? "text-gray-400 cursor-default"
                  : currentPage === page
                    ? "dark:bg-[#1f2937] bg-blue-500 text-white"
                    : "dark:bg-blue-500 bg-gray-400 text-white hover:bg-[#2d3748] disabled:cursor-not-allowed"
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
