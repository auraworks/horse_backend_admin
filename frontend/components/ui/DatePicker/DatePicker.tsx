"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Calendar } from "@/components/ui/Calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";

export function DatePicker({
  value,
  onChange,
  placeholder = "날짜 입력",
  className,
}: {
  value?: Date;
  onChange: (d?: Date) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-[142px] h-[38px] justify-between text-left font-normal bg-white border-[#EBEBEB]",
            value && "text-primary font-semibold",
            className
          )}
        >
          {value ? (
            format(value, "yyyy-MM-dd", { locale: ko })
          ) : (
            <span className="text-[#727272] text-xs">{placeholder}</span>
          )}
          <CalendarIcon className="ml-auto h-3 w-3 text-[#727272]" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-0 shadow-none" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => {
            onChange(d);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
