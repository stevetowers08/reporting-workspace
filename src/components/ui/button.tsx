import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 touch-manipulation",
  {
    variants: {
      variant: {
        default: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md active:scale-[0.98]",
        destructive: "bg-red-600 text-white hover:bg-red-700 shadow-sm hover:shadow-md active:scale-[0.98]",
        outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-400 shadow-sm hover:shadow-md active:scale-[0.98]",
        secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 shadow-sm hover:shadow-md active:scale-[0.98]",
        ghost: "text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:scale-[0.98]",
        link: "text-blue-600 underline-offset-4 hover:underline hover:text-blue-700",
        success: "bg-green-600 text-white hover:bg-green-700 shadow-sm hover:shadow-md active:scale-[0.98]",
        warning: "bg-yellow-500 text-white hover:bg-yellow-600 shadow-sm hover:shadow-md active:scale-[0.98]",
      },
      size: {
        default: "h-10 px-4 py-2 min-h-[44px]",
        sm: "h-8 px-3 py-1.5 text-xs min-h-[36px]",
        lg: "h-12 px-6 py-3 text-base min-h-[48px]",
        icon: "h-10 w-10 min-h-[44px] min-w-[44px]",
        xl: "h-14 px-8 py-4 text-lg min-h-[56px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

