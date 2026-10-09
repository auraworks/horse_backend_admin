import { cn } from "@/lib/utils";

interface DividerProps {
  type?: "horizontal" | "vertical";
  className?: string;
}

export const Divider = ({
  type = "horizontal",
  className = "",
}: DividerProps) => {
  if (type === "vertical") {
    return <div className={cn("w-px bg-border", className)} />;
  }

  return <div className={cn("h-px w-full bg-border", className)} />;
};
