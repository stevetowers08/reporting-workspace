# Design System

## Overview

This project uses a comprehensive design system built on **Radix UI** components with **Tailwind CSS** styling. The design system ensures consistency, accessibility, and maintainability across the application.

## Design Principles

### 1. Accessibility First
- **WCAG 2.1 AA compliance**: All components meet accessibility standards
- **Keyboard navigation**: Full keyboard support for all interactive elements
- **Screen reader support**: Proper ARIA labels and semantic HTML
- **Color contrast**: Minimum 4.5:1 contrast ratio for text

### 2. Consistency
- **Unified spacing**: Consistent margin and padding scales
- **Typography hierarchy**: Clear heading and text styles
- **Color palette**: Limited, purposeful color usage
- **Component patterns**: Reusable interaction patterns

### 3. Responsiveness
- **Mobile-first**: Design for mobile, enhance for desktop
- **Flexible layouts**: Components adapt to different screen sizes
- **Touch-friendly**: Appropriate touch targets (44px minimum)

## Color Palette

### Primary Colors
```css
/* Brand Colors */
--primary-50: #eff6ff;
--primary-100: #dbeafe;
--primary-500: #3b82f6;
--primary-600: #2563eb;
--primary-700: #1d4ed8;
--primary-900: #1e3a8a;

/* Neutral Colors */
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-200: #e5e7eb;
--gray-300: #d1d5db;
--gray-400: #9ca3af;
--gray-500: #6b7280;
--gray-600: #4b5563;
--gray-700: #374151;
--gray-800: #1f2937;
--gray-900: #111827;
```

### Semantic Colors
```css
/* Success */
--success-50: #f0fdf4;
--success-500: #22c55e;
--success-600: #16a34a;

/* Warning */
--warning-50: #fffbeb;
--warning-500: #f59e0b;
--warning-600: #d97706;

/* Error */
--error-50: #fef2f2;
--error-500: #ef4444;
--error-600: #dc2626;

/* Info */
--info-50: #f0f9ff;
--info-500: #06b6d4;
--info-600: #0891b2;
```

## Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 
             'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 
             'Helvetica Neue', sans-serif;
```

### Type Scale
```css
/* Headings */
.text-4xl { font-size: 2.25rem; line-height: 2.5rem; } /* h1 */
.text-3xl { font-size: 1.875rem; line-height: 2.25rem; } /* h2 */
.text-2xl { font-size: 1.5rem; line-height: 2rem; } /* h3 */
.text-xl { font-size: 1.25rem; line-height: 1.75rem; } /* h4 */
.text-lg { font-size: 1.125rem; line-height: 1.75rem; } /* h5 */
.text-base { font-size: 1rem; line-height: 1.5rem; } /* h6 */

/* Body Text */
.text-sm { font-size: 0.875rem; line-height: 1.25rem; }
.text-xs { font-size: 0.75rem; line-height: 1rem; }
```

### Font Weights
```css
.font-light { font-weight: 300; }
.font-normal { font-weight: 400; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }
```

## Spacing Scale

### Consistent Spacing
```css
/* Spacing Scale (Tailwind) */
.space-1 { margin/padding: 0.25rem; } /* 4px */
.space-2 { margin/padding: 0.5rem; } /* 8px */
.space-3 { margin/padding: 0.75rem; } /* 12px */
.space-4 { margin/padding: 1rem; } /* 16px */
.space-6 { margin/padding: 1.5rem; } /* 24px */
.space-8 { margin/padding: 2rem; } /* 32px */
.space-12 { margin/padding: 3rem; } /* 48px */
.space-16 { margin/padding: 4rem; } /* 64px */
```

## Component Library

### Base Components (`src/components/ui/`)

#### Button Component
```typescript
// src/components/ui/button.tsx
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "underline-offset-4 hover:underline text-primary",
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

#### Card Component
```typescript
// src/components/ui/card.tsx
import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "text-2xl font-semibold leading-none tracking-tight",
        className
      )}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

export { Card, CardHeader, CardTitle, CardContent };
```

#### Input Component
```typescript
// src/components/ui/input.tsx
import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
```

### Layout Components

#### Page Layout
```typescript
// src/components/layout/PageLayout.tsx
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
}

export const PageLayout = ({ 
  children, 
  className, 
  title, 
  description 
}: PageLayoutProps) => {
  return (
    <div className={cn("min-h-screen bg-gray-50", className)}>
      <div className="container mx-auto px-4 py-8">
        {(title || description) && (
          <div className="mb-8">
            {title && (
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-lg text-gray-600">
                {description}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
};
```

#### Dashboard Grid
```typescript
// src/components/layout/DashboardGrid.tsx
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DashboardGridProps {
  children: ReactNode;
  className?: string;
  columns?: 1 | 2 | 3 | 4;
}

export const DashboardGrid = ({ 
  children, 
  className, 
  columns = 2 
}: DashboardGridProps) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  };

  return (
    <div className={cn(
      "grid gap-6",
      gridCols[columns],
      className
    )}>
      {children}
    </div>
  );
};
```

### Data Display Components

#### Metrics Card
```typescript
// src/components/ui/MetricsCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { cn } from '@/lib/utils';

interface MetricsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
  };
  icon?: React.ReactNode;
  className?: string;
}

export const MetricsCard = ({ 
  title, 
  value, 
  change, 
  icon, 
  className 
}: MetricsCardProps) => {
  const changeColor = {
    increase: 'text-green-600',
    decrease: 'text-red-600',
    neutral: 'text-gray-600'
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        {icon && (
          <div className="h-4 w-4 text-muted-foreground">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && (
          <p className={cn("text-xs", changeColor[change.type])}>
            {change.type === 'increase' && '+'}
            {change.value}% from last period
          </p>
        )}
      </CardContent>
    </Card>
  );
};
```

#### Data Table
```typescript
// src/components/ui/DataTable.tsx
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DataTableProps {
  children: ReactNode;
  className?: string;
}

export const DataTable = ({ children, className }: DataTableProps) => {
  return (
    <div className={cn("rounded-md border", className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          {children}
        </table>
      </div>
    </div>
  );
};

export const TableHeader = ({ children, className }: DataTableProps) => {
  return (
    <thead className={cn("bg-gray-50", className)}>
      {children}
    </thead>
  );
};

export const TableBody = ({ children, className }: DataTableProps) => {
  return (
    <tbody className={cn("divide-y divide-gray-200", className)}>
      {children}
    </tbody>
  );
};

export const TableRow = ({ children, className }: DataTableProps) => {
  return (
    <tr className={cn("hover:bg-gray-50", className)}>
      {children}
    </tr>
  );
};

export const TableCell = ({ children, className }: DataTableProps) => {
  return (
    <td className={cn("px-6 py-4 whitespace-nowrap text-sm", className)}>
      {children}
    </td>
  );
};
```

## Design Tokens

### Shadows
```css
.shadow-sm { box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }
.shadow { box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1); }
.shadow-md { box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); }
.shadow-lg { box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1); }
```

### Border Radius
```css
.rounded-sm { border-radius: 0.125rem; }
.rounded { border-radius: 0.25rem; }
.rounded-md { border-radius: 0.375rem; }
.rounded-lg { border-radius: 0.5rem; }
.rounded-xl { border-radius: 0.75rem; }
```

### Transitions
```css
.transition-colors { transition-property: color, background-color, border-color, text-decoration-color, fill, stroke; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
.transition-all { transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); transition-duration: 150ms; }
```

## Responsive Design

### Breakpoints
```css
/* Mobile First Approach */
sm: 640px   /* Small devices */
md: 768px   /* Medium devices */
lg: 1024px  /* Large devices */
xl: 1280px  /* Extra large devices */
2xl: 1536px /* 2X large devices */
```

### Responsive Utilities
```css
/* Hide on mobile, show on desktop */
.hidden { display: none; }
.md:block { display: block; }

/* Responsive text sizes */
.text-sm { font-size: 0.875rem; }
.md:text-base { font-size: 1rem; }
.lg:text-lg { font-size: 1.125rem; }

/* Responsive spacing */
.p-4 { padding: 1rem; }
.md:p-6 { padding: 1.5rem; }
.lg:p-8 { padding: 2rem; }
```

## Accessibility Guidelines

### Focus Management
- **Visible focus indicators**: All interactive elements have clear focus states
- **Tab order**: Logical tab sequence through the interface
- **Skip links**: Allow users to skip to main content

### Color and Contrast
- **Minimum contrast**: 4.5:1 for normal text, 3:1 for large text
- **Color independence**: Information not conveyed by color alone
- **High contrast mode**: Support for system high contrast settings

### Screen Reader Support
- **Semantic HTML**: Use proper HTML elements (button, nav, main, etc.)
- **ARIA labels**: Provide descriptive labels for complex interactions
- **Live regions**: Announce dynamic content changes

## Usage Examples

### Creating a Dashboard Card
```typescript
import { MetricsCard } from '@/components/ui/MetricsCard';
import { TrendingUp, TrendingDown } from 'lucide-react';

export const CampaignMetrics = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <MetricsCard
        title="Total Spend"
        value="$12,345"
        change={{ value: 12, type: 'increase' }}
        icon={<TrendingUp />}
      />
      <MetricsCard
        title="Click Rate"
        value="3.2%"
        change={{ value: 5, type: 'decrease' }}
        icon={<TrendingDown />}
      />
      <MetricsCard
        title="Conversions"
        value="156"
        change={{ value: 0, type: 'neutral' }}
      />
    </div>
  );
};
```

### Creating a Data Table
```typescript
import { DataTable, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/DataTable';

export const CampaignTable = ({ campaigns }) => {
  return (
    <DataTable>
      <TableHeader>
        <TableRow>
          <TableCell>Campaign Name</TableCell>
          <TableCell>Platform</TableCell>
          <TableCell>Status</TableCell>
          <TableCell>Spend</TableCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {campaigns.map((campaign) => (
          <TableRow key={campaign.id}>
            <TableCell>{campaign.name}</TableCell>
            <TableCell>{campaign.platform}</TableCell>
            <TableCell>{campaign.status}</TableCell>
            <TableCell>${campaign.spend}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </DataTable>
  );
};
```

## Best Practices

### Component Design
1. **Single Responsibility**: Each component should have one clear purpose
2. **Composition over Inheritance**: Build complex components from simple ones
3. **Props Interface**: Define clear TypeScript interfaces for all props
4. **Default Values**: Provide sensible defaults for optional props

### Styling Guidelines
1. **Utility Classes**: Prefer Tailwind utility classes over custom CSS
2. **Consistent Spacing**: Use the defined spacing scale
3. **Color Usage**: Stick to the defined color palette
4. **Responsive Design**: Mobile-first approach with progressive enhancement

### Accessibility Checklist
- [ ] All interactive elements are keyboard accessible
- [ ] Proper ARIA labels and roles are used
- [ ] Color contrast meets WCAG standards
- [ ] Focus indicators are visible and clear
- [ ] Screen reader testing has been performed

---

For component implementation details, see [ARCHITECTURE.md](./ARCHITECTURE.md).  
For development guidelines, see [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md).  
For testing components, see [TESTING.md](./TESTING.md).
