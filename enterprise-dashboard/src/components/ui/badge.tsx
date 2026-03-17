import { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", {
  variants: {
    variant: {
      success: "bg-success/15 text-success",
      warning: "bg-warning/15 text-warning",
      danger: "bg-danger/15 text-danger",
      primary: "bg-primary/15 text-primary",
      info: "bg-primary/10 text-primary",
      neutral: "bg-muted text-muted-foreground"
    }
  },
  defaultVariants: {
    variant: "neutral"
  }
});

interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
