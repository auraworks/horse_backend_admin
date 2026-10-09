"use client";

import * as React from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select/Select";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  // Open on the selected date's month (e.g. a birth date years ago), falling back to today
  const initialSelected = (props as { selected?: unknown }).selected;
  const [month, setMonthState] = React.useState<Date>(
    props.defaultMonth ?? (initialSelected instanceof Date ? initialSelected : new Date())
  );
  const [selectedMonth, setSelectedMonth] = React.useState(month.getMonth());
  const [selectedYear, setSelectedYear] = React.useState(month.getFullYear());

  const months = [
    "1월",
    "2월",
    "3월",
    "4월",
    "5월",
    "6월",
    "7월",
    "8월",
    "9월",
    "10월",
    "11월",
    "12월",
  ];

  const years = Array.from(
    { length: 100 },
    (_, i) => new Date().getFullYear() - 50 + i
  );

  const setMonth = (d: Date) => {
    setMonthState(d);
    setSelectedMonth(d.getMonth());
    setSelectedYear(d.getFullYear());
  };

  const handlePreviousMonth = () => {
    const newDate = new Date(month);
    newDate.setMonth(newDate.getMonth() - 1);
    setMonth(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(month);
    newDate.setMonth(newDate.getMonth() + 1);
    setMonth(newDate);
  };

  const handleMonthChange = (value: string) => {
    const newMonth = parseInt(value);
    setMonth(new Date(selectedYear, newMonth, 1));
  };

  const handleYearChange = (value: string) => {
    const newYear = parseInt(value);
    setMonth(new Date(newYear, selectedMonth, 1));
  };

  return (
    <div
      className={cn(
        "w-[250px] p-3 rounded-[10px] bg-white border border-[#E5E5E5]",
        className
      )}
    >
      {/* Custom Header */}
      <div className="flex items-center justify-between h-8 mb-4">
        <button
          type="button"
          aria-label="이전 달"
          onClick={handlePreviousMonth}
          className="flex w-8 h-8 justify-center items-center rounded-md hover:bg-accent transition-colors focus:outline-none"
        >
          <ChevronLeftIcon className="w-4 h-4 stroke-[#0A0A0A]" />
        </button>

        <div className="flex items-center gap-1.5">
          <Select
            value={selectedMonth.toString()}
            onValueChange={handleMonthChange}
          >
            <SelectTrigger className="h-8 w-auto px-2 border border-[#E5E5E5] focus:ring-0 text-sm font-medium">
              <SelectValue placeholder="월 선택" />
            </SelectTrigger>
            <SelectContent>
              {months.map((m, i) => (
                <SelectItem key={i} value={i.toString()}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedYear.toString()}
            onValueChange={handleYearChange}
          >
            <SelectTrigger className="h-8 w-auto px-2 border border-[#E5E5E5] focus:ring-0 text-sm font-medium">
              <SelectValue placeholder="연도 선택" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <button
          type="button"
          aria-label="다음 달"
          onClick={handleNextMonth}
          className="flex w-8 h-8 justify-center items-center rounded-md hover:bg-accent transition-colors focus:outline-none"
        >
          <ChevronRightIcon className="w-4 h-4 stroke-[#0A0A0A]" />
        </button>
      </div>

      {/* DayPicker without header */}
      <DayPicker
        mode="single"
        month={month}
        onMonthChange={setMonth}
        showOutsideDays={showOutsideDays}
        formatters={{
          formatWeekdayName: (date) => {
            const days = ["일", "월", "화", "수", "목", "금", "토"];
            return days[date.getDay()];
          },
        }}
        classNames={{
          months: "flex flex-col",
          month: "flex flex-col",
          caption: "hidden",
          caption_label: "hidden",
          nav: "hidden",
          month_grid: "w-full",
          weekdays: "flex w-full",
          weekday:
            "flex w-8 h-[21px] justify-center items-center text-[#737373] text-xs font-normal",
          week: "flex w-full mt-2",
          day: "flex w-8 h-8 justify-center items-center p-0 relative focus:outline-none text-[#0A0A0A]",
          day_button:
            "flex w-8 h-8 justify-center items-center rounded-lg text-sm font-normal hover:bg-accent transition-colors",
          selected:
            "!bg-primary !text-white hover:!bg-primary hover:!text-white !rounded-lg",
          today: "bg-transparent font-normal",
          outside: "text-[#0A0A0A] opacity-50",
          disabled: "text-[#737373] opacity-50",
          hidden: "invisible",
          ...classNames,
        }}
        {...props}
      />
    </div>
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
