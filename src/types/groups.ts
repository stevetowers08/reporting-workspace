/**
 * Types for the Groups feature
 */

import { Client } from '@/services/data/databaseService';

// ============================================================================
// Group Entity Types
// ============================================================================

export type GroupStatus = 'active' | 'paused' | 'archived';

export interface Group {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  status: GroupStatus;
  shareable_link?: string;
  share_config: GroupShareConfig;
  client_count?: number; // Available when fetched from group_summary view
  created_at: string;
  updated_at: string;
}

export interface GroupWithClients extends Group {
  clients: (Client & { display_order?: number })[];
  client_count: number;
}

export interface GroupClient {
  id: string;
  group_id: string;
  client_id: string;
  display_order: number;
  added_at: string;
  client?: Client; // Populated when fetching with join
}

// ============================================================================
// Share Configuration Types
// ============================================================================

export type ShareAccessLevel = 'view' | 'edit';
export type ShareExpiration = 'never' | '7days' | '30days' | '90days' | 'custom';
export type ResourceType = 'client' | 'group';

export interface GroupShareConfig {
  allowIndividualSharing?: boolean;
  showClientList?: boolean;
  theme?: 'light' | 'dark' | 'auto';
}

export interface ShareOptions {
  expiration?: ShareExpiration;
  customExpirationDate?: string;
  password?: string;
  accessLevel?: ShareAccessLevel;
  allowDownload?: boolean;
}

export interface ShareToken {
  id: string;
  token: string;
  resource_type: ResourceType;
  resource_id: string;
  access_level: ShareAccessLevel;
  expires_at?: string;
  password_hash?: string;
  access_count: number;
  last_accessed_at?: string;
  created_at: string;
  created_by?: string;
}

export interface ShareValidationResult {
  valid: boolean;
  token: ShareToken;
  resource: Client | GroupWithClients;
  requiresPassword: boolean;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateGroupRequest {
  name: string;
  description?: string;
  logo_url?: string;
  clientIds?: string[];
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
  logo_url?: string;
  status?: GroupStatus;
  share_config?: Partial<GroupShareConfig>;
}

export interface AddClientsToGroupRequest {
  clientIds: string[];
}

export interface ReorderClientsRequest {
  clientOrders: { clientId: string; order: number }[];
}

export interface CreateShareLinkRequest {
  resourceType: ResourceType;
  resourceId: string;
  options?: ShareOptions;
}

export interface CreateShareLinkResponse {
  token: string;
  shareUrl: string;
  expiresAt?: string;
}

// ============================================================================
// Shared View Types
// ============================================================================

export interface SharedGroupData {
  group: Group;
  clients: Client[];
  shareConfig: GroupShareConfig;
}

export interface SharedClientData {
  client: Client;
  groupContext?: {
    groupId: string;
    groupName: string;
    otherClients: Pick<Client, 'id' | 'name' | 'logo_url'>[];
  };
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface GroupCardProps {
  group: Group;
  clientCount: number;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
  onView: () => void;
}

export interface GroupListProps {
  groups: Group[];
  isLoading: boolean;
  onEdit: (group: Group) => void;
  onDelete: (group: Group) => void;
  onShare: (group: Group) => void;
  onView: (group: Group) => void;
}

export interface ClientSelectorProps {
  selectedClientIds: string[];
  onChange: (clientIds: string[]) => void;
  excludeClientIds?: string[];
  disabled?: boolean;
}

export interface DraggableClientListProps {
  clients: (Client & { display_order?: number })[];
  onReorder: (clients: (Client & { display_order?: number })[]) => void;
  onRemove: (clientId: string) => void;
  readOnly?: boolean;
}

export interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
}

export interface ShareLinkSettingsProps {
  options: ShareOptions;
  onChange: (options: ShareOptions) => void;
}

// ============================================================================
// Hook Return Types
// ============================================================================

export interface UseGroupsReturn {
  groups: Group[];
  isLoading: boolean;
  error: Error | null;
  createGroup: (data: CreateGroupRequest) => Promise<Group>;
  updateGroup: (id: string, updates: UpdateGroupRequest) => Promise<Group>;
  deleteGroup: (id: string) => Promise<void>;
  refreshGroups: () => void;
}

export interface UseGroupReturn {
  group: GroupWithClients | null;
  isLoading: boolean;
  error: Error | null;
  addClient: (clientId: string) => Promise<void>;
  addClients: (clientIds: string[]) => Promise<void>;
  removeClient: (clientId: string) => Promise<void>;
  reorderClients: (orders: { clientId: string; order: number }[]) => Promise<void>;
  generateShareLink: (options?: ShareOptions) => Promise<CreateShareLinkResponse>;
  revokeShareLink: () => Promise<void>;
  refreshGroup: () => void;
}

export interface UseSharedViewReturn {
  resourceType: ResourceType | null;
  resourceData: SharedGroupData | SharedClientData | null;
  isLoading: boolean;
  error: Error | null;
  isValid: boolean;
  requiresPassword: boolean;
  validatePassword: (password: string) => Promise<boolean>;
}
