import { cn } from "@/lib/utils";
import React, { forwardRef } from "react";

const Card = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'elevated' | 'outlined' | 'glass' | 'compact' | 'spacious' }>(({ className, variant = 'default', ...props }, ref) => {
  const variants = {
    default: "rounded-2xl border border-border bg-card text-card-foreground shadow-sm p-6",
    elevated: "rounded-2xl border border-border bg-card text-card-foreground shadow-md hover:shadow-lg transition-shadow p-6",
    outlined: "rounded-2xl border border-border bg-card text-card-foreground shadow-sm p-6",
    glass: "rounded-2xl border border-border bg-white/70 backdrop-blur-md text-card-foreground shadow-sm p-6",
    compact: "rounded-xl border border-border bg-card text-card-foreground shadow-sm p-4",
    spacious: "rounded-3xl border border-border bg-card text-card-foreground shadow-sm p-8"
  };
  
  return (
    <div ref={ref} className={cn(variants[variant], className)} {...props} />
  );
});
Card.displayName = "Card";

const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-xl font-semibold leading-tight tracking-tight", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-2", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };

