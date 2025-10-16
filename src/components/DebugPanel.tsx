import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
// import { DebugLog, debugLogger } from '@/lib/debug';
import { Download, Filter, RefreshCw, Trash2, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface DebugPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [filter, setFilter] = useState<{ level?: string; category?: string }>({});
    const [autoRefresh, setAutoRefresh] = useState(true);

    useEffect(() => {
        if (!isOpen) {return;}

        const updateLogs = () => {
            // Logs not available
            setLogs([]);
        };

        updateLogs();

        if (autoRefresh) {
            const interval = setInterval(updateLogs, 1000);
            return () => clearInterval(interval);
        }
    }, [isOpen, filter, autoRefresh]);

    const handleExport = () => {
        const data = { logs, timestamp: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `debug-logs-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleClear = () => {
        setLogs([]);
    };

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'error': return 'bg-red-100 text-red-800';
            case 'warn': return 'bg-yellow-100 text-yellow-800';
            case 'info': return 'bg-blue-100 text-blue-800';
            case 'debug': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleTimeString();
    };

    if (!isOpen) {return null;}

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-6xl h-[80vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold">Debug Panel</h2>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={autoRefresh ? 'bg-green-50' : ''}
                        >
                            <RefreshCw className={`h-4 w-4 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
                            Auto Refresh
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExport}>
                            <Download className="h-4 w-4 mr-1" />
                            Export
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleClear}>
                            <Trash2 className="h-4 w-4 mr-1" />
                            Clear
                        </Button>
                        <Button variant="outline" size="sm" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden">
                    <Tabs defaultValue="logs" className="h-full">
                        <div className="flex border-b">
                            <div className="px-4 py-2 text-sm font-medium border-b-2 border-blue-500">
                                Logs ({logs.length})
                            </div>
                        </div>

                        <div className="h-full overflow-hidden">
                            {/* Filters */}
                            <div className="p-4 border-b bg-gray-50">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <Filter className="h-4 w-4" />
                                        <span className="text-sm font-medium">Filter:</span>
                                    </div>
                                    <select
                                        value={filter.level || ''}
                                        onChange={(e) => setFilter(prev => ({ ...prev, level: e.target.value || undefined }))}
                                        className="px-2 py-1 border rounded text-sm"
                                    >
                                        <option value="">All Levels</option>
                                        <option value="error">Error</option>
                                        <option value="warn">Warning</option>
                                        <option value="info">Info</option>
                                        <option value="debug">Debug</option>
                                    </select>
                                    <input
                                        type="text"
                                        placeholder="Filter by category..."
                                        value={filter.category || ''}
                                        onChange={(e) => setFilter(prev => ({ ...prev, category: e.target.value || undefined }))}
                                        className="px-2 py-1 border rounded text-sm flex-1 max-w-xs"
                                    />
                                </div>
                            </div>

                            {/* Logs */}
                            <div className="h-full overflow-y-auto p-4">
                                {logs.length === 0 ? (
                                    <div className="text-center text-gray-500 py-8">
                                        No logs found
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {logs.map((log) => (
                                            <div key={log.id} className="border rounded p-3 bg-white">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <Badge className={getLevelColor(log.level)}>
                                                            {log.level.toUpperCase()}
                                                        </Badge>
                                                        <span className="text-sm font-medium text-gray-600">
                                                            [{log.category}]
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {formatTimestamp(log.timestamp)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-sm text-gray-900 mb-2">
                                                    {log.message}
                                                </div>
                                                {log.data && (
                                                    <details className="text-xs">
                                                        <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                                                            Data ({typeof log.data})
                                                        </summary>
                                                        <pre className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
                                                            {JSON.stringify(log.data, null, 2)}
                                                        </pre>
                                                    </details>
                                                )}
                                                {log.stack && (
                                                    <details className="text-xs">
                                                        <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                                                            Stack Trace
                                                        </summary>
                                                        <pre className="mt-2 p-2 bg-red-50 rounded overflow-x-auto text-red-800">
                                                            {log.stack}
                                                        </pre>
                                                    </details>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Tabs>
                </div>
            </Card>
        </div>
    );
};

export default DebugPanel;
