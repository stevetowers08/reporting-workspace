// Component Prop Types
export interface DashboardProps {
  data?: any; // Using any for now to avoid circular dependencies
  isLoading?: boolean;
  error?: Error | null;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: any) => void;
}

export interface ChartProps {
  data: any[];
  options?: any;
  height?: number;
  width?: number;
}

export interface TableProps {
  data: any[];
  columns: TableColumn[];
  onRowClick?: (row: any) => void;
  isLoading?: boolean;
}

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

export interface ConnectionProps {
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  isLoading?: boolean;
}

export interface MetricsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  isLoading?: boolean;
}
