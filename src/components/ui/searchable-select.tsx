import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Search } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";

interface SearchableSelectProps {
    options: Array<{ value: string; label: string }>;
    value?: string;
    onValueChange: (value: string) => void;
    onOpenChange?: (open: boolean) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    className?: string;
}

export function SearchableSelect({
    options,
    value,
    onValueChange,
    onOpenChange,
    placeholder = "Select option...",
    searchPlaceholder = "Search...",
    className
}: SearchableSelectProps) {
    const [open, setOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState("");

    const selectedOption = options.find((option) => option.value === value);

    const filteredOptions = options.filter((option) =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelect = (optionValue: string) => {
        onValueChange(optionValue);
        setOpen(false);
        onOpenChange?.(false);
        setSearchTerm("");
    };

    const buttonRef = React.useRef<HTMLButtonElement>(null);
    const [position, setPosition] = React.useState({ top: 0, left: 0, width: 0 });

    const updatePosition = React.useCallback(() => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setPosition({
                top: rect.bottom + 4, // Small gap below button
                left: rect.left,
                width: rect.width
            });
        }
    }, []);

    React.useEffect(() => {
        if (open) {
            updatePosition();
            
            // Update position on scroll or resize
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
            
            return () => {
                window.removeEventListener('scroll', updatePosition, true);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [open, updatePosition]);

    const dropdownContent = open && (
        <div
            className="fixed bg-white border border-gray-200 rounded-md z-[9999]"
            style={{
                top: position.top,
                left: position.left,
                width: position.width,
                maxHeight: '300px'
            }}
        >
            <div className="p-2 border-b">
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder={searchPlaceholder}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                        autoFocus
                    />
                </div>
            </div>
            <div className="max-h-60 overflow-y-auto">
                {filteredOptions.length > 0 ? (
                    filteredOptions.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            className={cn(
                                "w-full text-left px-3 py-1.5 text-sm flex items-center",
                                value === option.value && "bg-blue-50 text-blue-600"
                            )}
                            onClick={() => handleSelect(option.value)}
                        >
                            <Check
                                className={cn(
                                    "mr-2 h-3.5 w-3.5",
                                    value === option.value ? "opacity-100" : "opacity-0"
                                )}
                            />
                            {option.label}
                        </button>
                    ))
                ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">
                        No options found
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="relative">
            <Button
                ref={buttonRef}
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className={cn("w-full justify-between", className)}
                onClick={() => {
                    const newOpen = !open;
                    setOpen(newOpen);
                    onOpenChange?.(newOpen);
                }}
            >
                {selectedOption ? selectedOption.label : placeholder}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>

            {open && (
                <div
                    className="fixed inset-0 z-[9998]"
                    onClick={() => {
                        setOpen(false);
                        onOpenChange?.(false);
                        setSearchTerm("");
                    }}
                />
            )}

            {open && createPortal(dropdownContent, document.body)}
        </div>
    );
}