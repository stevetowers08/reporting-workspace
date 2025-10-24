import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { TabExportOptions } from '@/services/export/pdfExportService';
import { X } from 'lucide-react';
import React, { useState } from 'react';

interface PDFExportOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: TabExportOptions) => void;
  clientName: string;
  dateRange: string | { start: string; end: string };
  availableTabs: string[];
  isExporting: boolean;
}

export const PDFExportOptionsModal: React.FC<PDFExportOptionsModalProps> = ({
  isOpen,
  onClose,
  onExport,
  clientName,
  dateRange,
  availableTabs,
  isExporting
}) => {
  const [options, setOptions] = useState<TabExportOptions>({
    clientName,
    dateRange: typeof dateRange === 'string' ? dateRange : `${dateRange.start} - ${dateRange.end}`,
    includeCharts: true,
    includeDetailedMetrics: true,
    includeAllTabs: true,
    tabs: availableTabs
  });

  const handleExport = () => {
    onExport(options);
  };

  const handleTabToggle = (tab: string, checked: boolean) => {
    if (checked) {
      setOptions(prev => ({
        ...prev,
        tabs: [...(prev.tabs || []), tab]
      }));
    } else {
      setOptions(prev => ({
        ...prev,
        tabs: prev.tabs?.filter(t => t !== tab)
      }));
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">PDF Export Options</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isExporting}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Client Info */}
          <div>
            <Label className="text-sm font-medium text-slate-700">Client</Label>
            <p className="text-sm text-slate-600 mt-1">{clientName}</p>
          </div>

          <div>
            <Label className="text-sm font-medium text-slate-700">Date Range</Label>
            <p className="text-sm text-slate-600 mt-1">
              {typeof dateRange === 'string' ? dateRange : `${dateRange.start} - ${dateRange.end}`}
            </p>
          </div>

          {/* Tab Selection */}
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-3 block">
              Select Tabs to Export
            </Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="all-tabs"
                  checked={options.includeAllTabs}
                  onCheckedChange={(checked) => 
                    setOptions(prev => ({ ...prev, includeAllTabs: !!checked }))
                  }
                />
                <Label htmlFor="all-tabs" className="text-sm">
                  Export All Tabs
                </Label>
              </div>
              
              {!options.includeAllTabs && (
                <div className="ml-6 space-y-2">
                  {availableTabs.map(tab => (
                    <div key={tab} className="flex items-center space-x-2">
                      <Checkbox
                        id={`tab-${tab}`}
                        checked={options.tabs?.includes(tab) || false}
                        onCheckedChange={(checked) => handleTabToggle(tab, !!checked)}
                      />
                      <Label htmlFor={`tab-${tab}`} className="text-sm capitalize">
                        {tab}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Content Options */}
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-3 block">
              Content Options
            </Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-charts"
                  checked={options.includeCharts}
                  onCheckedChange={(checked) => 
                    setOptions(prev => ({ ...prev, includeCharts: !!checked }))
                  }
                />
                <Label htmlFor="include-charts" className="text-sm">
                  Include Charts and Visualizations
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-detailed"
                  checked={options.includeDetailedMetrics}
                  onCheckedChange={(checked) => 
                    setOptions(prev => ({ ...prev, includeDetailedMetrics: !!checked }))
                  }
                />
                <Label htmlFor="include-detailed" className="text-sm">
                  Include Detailed Metrics
                </Label>
              </div>
            </div>
          </div>

          {/* Export Format */}
          <div>
            <Label className="text-sm font-medium text-slate-700 mb-3 block">
              Export Format
            </Label>
            <RadioGroup
              value="pdf"
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="text-sm">
                  PDF Document (Recommended)
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-slate-50">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </Button>
        </div>
      </div>
    </div>
  );
};
