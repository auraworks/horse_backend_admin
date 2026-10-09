"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Label } from "@/components/ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";

interface {{MODULE_NAME_PASCAL}}FormProps {
  mode: "new" | "edit";
  initialData?: {
    {{FORM_FIELDS_TYPE}}
  };
}

export default function {{MODULE_NAME_PASCAL}}Form({
  mode,
  initialData,
}: {{MODULE_NAME_PASCAL}}FormProps) {
  const router = useRouter();
  {{FORM_STATE}}

  const handleCancel = () => {
    router.back();
  };

  const handleSave = () => {
    console.log("저장 처리");
    router.back();
  };

  const handleDelete = () => {
    if (confirm("정말 삭제하시겠습니까?")) {
      console.log("삭제 처리");
      router.back();
    }
  };

  return (
    <div className="flex bg-[#F3F2F0] w-full min-h-screen p-8 items-start justify-start">
      <div className="flex flex-col justify-center items-start gap-6 flex-1 rounded-[5px] bg-white p-11">
        <div className="flex flex-col items-start gap-4 self-stretch">
          {/* Header */}
          <div className="flex justify-between items-center self-stretch mb-2">
            <h1 className="text-[#2A2A2A] font-semibold text-2xl leading-8">
              {{TITLE}} {mode === "new" ? "등록" : "상세"}
            </h1>
          </div>

          {{FORM_FIELDS}}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between w-full pt-6 border-t border-[#E5E5E5]">
          <div>
            {mode === "edit" && (
              <Button
                variant="outline"
                onClick={handleDelete}
                className="h-10 px-6 border-2 border-red-500 text-red-500 hover:bg-red-50"
              >
                삭제
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="h-10 px-6 border-[#EBEBEB]"
            >
              취소
            </Button>
            <Button
              onClick={handleSave}
              className="h-10 px-6 bg-primary hover:bg-primary/90 text-white"
            >
              저장
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
