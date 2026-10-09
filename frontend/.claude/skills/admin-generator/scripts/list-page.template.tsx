"use client";

import { useState } from "react";
import { useScrollUp } from "@/components/hooks/useScrollUp";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Calendar } from "@/components/ui/Calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarIcon, Search, RefreshCw, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/Pagination";

{{SAMPLE_DATA}}

export default function {{MODULE_NAME_PASCAL}}Page() {
  const router = useScrollUp();
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>(new Date(2025, 7, 8));
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState("10");

  const itemsPerPageNum = parseInt(itemsPerPage);
  const totalPages = Math.ceil(allTableData.length / itemsPerPageNum);
  const startIndex = (currentPage - 1) * itemsPerPageNum;
  const endIndex = startIndex + itemsPerPageNum;
  const displayedData = allTableData.slice(startIndex, endIndex);

  const handleRowClick = (id: string) => {
    router.push(`{{BASE_PATH}}/${id}`);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] px-12 py-12">
      <div className="w-full flex flex-col gap-6 flex-1 overflow-hidden">
        {/* Page Title */}
        <h1 className="text-2xl font-semibold text-[#2A2A2A] leading-8">
          {{TITLE}} 관리
        </h1>

        {/* Filter Section */}
        <div className="flex flex-col gap-[18px] p-8 bg-stone-50 rounded">
          <div className="flex items-start gap-6">
            {/* Date Filter */}
            <div className="flex items-center gap-2">
              <label className="w-auto text-base font-semibold text-[#555] leading-6">
                {{DATE_FILTER_LABEL}}
              </label>
              <div className="flex items-center gap-2.5">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[142px] h-10 justify-between text-left font-normal bg-white border-[#EBEBEB] shadow-none",
                        endDate && "text-primary font-semibold"
                      )}
                    >
                      {endDate ? (
                        format(endDate, "yyyy-MM-dd", { locale: ko })
                      ) : (
                        <span className="text-[#727272]">날짜 입력</span>
                      )}
                      <CalendarIcon className="ml-auto h-3 w-3 text-[#727272]" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0 bg-transparent border-none shadow-none"
                    align="start"
                  >
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      required
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-xs text-black">-</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[142px] h-10 justify-between text-left font-normal bg-white border-[#EBEBEB] shadow-none",
                        startDate && "text-primary font-semibold"
                      )}
                    >
                      {startDate ? (
                        format(startDate, "yyyy-MM-dd", { locale: ko })
                      ) : (
                        <span className="text-[#727272]">날짜 입력</span>
                      )}
                      <CalendarIcon className="ml-auto h-3 w-3 text-[#727272]" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0 bg-transparent border-none shadow-none"
                    align="start"
                  >
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      required
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {{ADDITIONAL_FILTERS}}
          </div>

          {/* Search Section */}
          <div className="flex items-start gap-[18px]">
            <div className="flex items-center gap-2 flex-1">
              <label className="w-auto text-base font-semibold text-[#555] leading-6 whitespace-nowrap">
                검색어
              </label>
              <div className="flex items-center gap-[22px] flex-1">
                <Select defaultValue="{{SEARCH_DEFAULT}}">
                  <SelectTrigger className="w-auto h-10 bg-white border-[#EBEBEB] text-primary font-semibold text-xs px-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {{SEARCH_OPTIONS}}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="검색조건을 입력해주세요"
                  className="flex-1 h-10 bg-white border-[#EBEBEB] text-xs text-[#727272] placeholder:text-[#727272]"
                />
              </div>
            </div>
            <div className="flex items-center gap-[18px]">
              <Button className="w-[120px] h-10 bg-primary hover:bg-primary/90 text-white font-semibold gap-2.5">
                <Search className="w-4 h-4" />
                검색
              </Button>
              <Button
                variant="outline"
                className="w-[120px] h-10 border-[1.6px] border-primary text-primary hover:bg-primary/5 gap-2.5"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="font-normal">초기화</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between">
          <p className="text-xl text-[#6D6D6D] leading-6 tracking-[-0.4px]">
            총 <span className="text-primary">{allTableData.length}</span>{{COUNT_UNIT}}
          </p>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="h-10 border-2 border-[#4CA452] text-[#4CA452] hover:bg-[#4CA452]/5 gap-2"
            >
              <FileDown className="w-4 h-4" />
              <span className="text-sm font-semibold tracking-[-0.28px]">
                엑셀 다운로드
              </span>
            </Button>
            <Button
              className="h-10 bg-primary hover:bg-primary/90 text-white"
              onClick={() => router.push("{{BASE_PATH}}/new")}
            >
              <span className="text-sm font-semibold tracking-[-0.28px]">
                {{TITLE}} 등록
              </span>
            </Button>
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-y-auto border border-[#E5E5E5] rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="bg-stone-50 border-b border-[#E5E5E5]">
                {{TABLE_HEADERS}}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedData.map((row, index) => (
                <TableRow
                  key={index}
                  className="border-b border-[#E5E5E5] cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleRowClick(row.{{ID_FIELD}})}
                >
                  {{TABLE_CELLS}}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="sticky bottom-0 left-0 right-0 flex items-start gap-6 bg-white pt-4">
          <Select value={itemsPerPage} onValueChange={handleItemsPerPageChange}>
            <SelectTrigger className="w-auto h-[43px] bg-white border-[#EBEBEB] px-3">
              <SelectValue className="text-primary text-xs font-semibold" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10개씩 보기</SelectItem>
              <SelectItem value="20">20개씩 보기</SelectItem>
              <SelectItem value="50">50개씩 보기</SelectItem>
            </SelectContent>
          </Select>

          <div className=" flex w-full justify-end">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage > 1) setCurrentPage(currentPage - 1);
                    }}
                    disabled={currentPage === 1}
                  />
                </PaginationItem>

                {[1, 2, 3].map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      isActive={currentPage === page}
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(page);
                      }}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                {totalPages > 6 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}

                {[totalPages - 2, totalPages - 1, totalPages].map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      isActive={currentPage === page}
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(page);
                      }}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    onClick={(e) => {
                      e.preventDefault();
                      if (currentPage < totalPages)
                        setCurrentPage(currentPage + 1);
                    }}
                    disabled={currentPage === totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      </div>
    </div>
  );
}
