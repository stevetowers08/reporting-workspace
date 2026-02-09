# Groups Feature Implementation Plan

## Overview
Implement a Groups feature that allows organizing multiple clients/venues into named collections. Each group can be shared via a unique link, and individual clients within the group can also be shared.

---

## 1. Database Schema

### New Tables

#### `groups`
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique identifier |
| `name` | VARCHAR(255) | Group name |
| `description` | TEXT | Optional description |
| `logo_url` | VARCHAR(500) | Optional group logo |
| `status` | ENUM | 'active', 'paused', 'archived' |
| `shareable_link` | VARCHAR(255) | Unique share token for public access |
| `share_config` | JSONB | Sharing preferences (expiration, password, etc.) |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

#### `group_clients` (Join Table)
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique identifier |
| `group_id` | UUID (FK) | Reference to groups |
| `client_id` | UUID (FK) | Reference to clients |
| `display_order` | INTEGER | For custom ordering within group |
| `added_at` | TIMESTAMP | When client was added to group |

#### `share_tokens` (Optional - for enhanced security)
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Unique identifier |
| `token` | VARCHAR(255) | Unique share token (indexed) |
| `resource_type` | ENUM | 'client', 'group' |
| `resource_id` | UUID | Reference to client or group |
| `access_level` | ENUM | 'view', 'edit', 'admin' |
| `expires_at` | TIMESTAMP | Optional expiration |
| `password_hash` | VARCHAR(255) | Optional password protection |
| `access_count` | INTEGER | Number of times accessed |
| `last_accessed_at` | TIMESTAMP | Last access timestamp |
| `created_at` | TIMESTAMP | Creation timestamp |
| `created_by` | UUID | User who created the share |

### Relationships
```
groups ||--o{ group_clients : contains
groups ||--o{ share_tokens : shared_via
clients ||--o{ group_clients : belongs_to
clients ||--o{ share_tokens : shared_via
```

---

## 2. Backend Services

### DatabaseService Extensions
```typescript
// Group CRUD operations
static async getAllGroups(): Promise<Group[]>
static async getGroup(id: string): Promise<Group | null>
static async createGroup(groupData: GroupCreateData): Promise<Group>
static async updateGroup(id: string, updates: Partial<Group>): Promise<Group>
static async deleteGroup(id: string): Promise<void>

// Group-Client relationship operations
static async getGroupClients(groupId: string): Promise<Client[]>
static async addClientToGroup(groupId: string, clientId: string, displayOrder?: number): Promise<void>
static async removeClientFromGroup(groupId: string, clientId: string): Promise<void>
static async reorderGroupClients(groupId: string, clientOrders: {clientId: string, order: number}[]): Promise<void>

// Share token operations
static async createShareToken(tokenData: ShareTokenCreateData): Promise<ShareToken>
static async validateShareToken(token: string): Promise<ShareValidationResult | null>
static async revokeShareToken(token: string): Promise<void>
static async getShareTokensForResource(resourceType: string, resourceId: string): Promise<ShareToken[]>
```

### GroupService (New)
```typescript
class GroupService {
  // Group management
  static async createGroupWithClients(
    groupData: GroupCreateData, 
    clientIds: string[]
  ): Promise<Group>
  
  static async cloneGroup(groupId: string, newName: string): Promise<Group>
  
  static async getGroupWithClients(groupId: string): Promise<GroupWithClients>
  
  // Sharing
  static async generateShareLink(
    groupId: string, 
    options?: ShareOptions
  ): Promise<string>
  
  static async getSharedGroupData(token: string): Promise<SharedGroupData | null>
  
  // Bulk operations
  static async bulkAddClients(groupId: string, clientIds: string[]): Promise<void>
  static async bulkRemoveClients(groupId: string, clientIds: string[]): Promise<void>
}
```

---

## 3. React Hooks

### useGroups
```typescript
const useGroups = () => {
  const groups: Group[];
  const isLoading: boolean;
  const error: Error | null;
  const createGroup: (data: GroupCreateData) => Promise<Group>;
  const updateGroup: (id: string, updates: Partial<Group>) => Promise<Group>;
  const deleteGroup: (id: string) => Promise<void>;
  const refreshGroups: () => void;
}
```

### useGroup
```typescript
const useGroup = (groupId: string) => {
  const group: Group | null;
  const clients: Client[];
  const isLoading: boolean;
  const error: Error | null;
  const addClient: (clientId: string) => Promise<void>;
  const removeClient: (clientId: string) => Promise<void>;
  const reorderClients: (orders: {clientId: string, order: number}[]) => Promise<void>;
  const generateShareLink: (options?: ShareOptions) => Promise<string>;
  const revokeShareLink: () => Promise<void>;
}
```

### useSharedView
```typescript
const useSharedView = (token: string) => {
  const resourceType: 'client' | 'group' | null;
  const resourceData: Client | GroupWithClients | null;
  const isLoading: boolean;
  const error: Error | null;
  const isValid: boolean;
}
```

---

## 4. UI Components

### Group Management

#### GroupsListPage (`/agency/groups`)
- Display all groups in a grid/list view
- Search and filter functionality
- Create new group button
- Quick actions: Edit, Delete, Share, View

#### GroupCreateModal
- Group name input
- Description textarea
- Logo upload (optional)
- Initial client selection (multi-select)

#### GroupEditPage (`/agency/groups/:groupId/edit`)
- Edit group details
- Client management panel:
  - List of current clients with drag-drop reordering
  - Add clients (search + multi-select)
  - Remove clients
- Sharing settings panel
- Danger zone (delete group)

#### GroupDetailView (`/groups/:groupId`)
- Group header with logo, name, description
- Client cards grid
- Share button
- Export options (PDF report for entire group)

### Shared Views

#### SharedGroupView (`/share/g/:token`)
- Public-facing group view
- List of clients in the group
- Click to view individual client dashboard
- Optional: password protection modal

#### SharedClientView (`/share/c/:token`) - Enhanced
- Enhanced from existing `/share/:clientId`
- Uses token-based access instead of direct ID
- Optional expiration handling

### Components

```typescript
// GroupCard - Display group in a card format
interface GroupCardProps {
  group: Group;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
  clientCount: number;
}

// ClientSelector - Multi-select for adding clients to group
interface ClientSelectorProps {
  selectedClientIds: string[];
  onChange: (clientIds: string[]) => void;
  excludeClientIds?: string[]; // Already in group
}

// DraggableClientList - Reorder clients within group
interface DraggableClientListProps {
  clients: Client[];
  onReorder: (clients: Client[]) => void;
  onRemove: (clientId: string) => void;
}

// ShareLinkModal - Generate and manage share links
interface ShareLinkModalProps {
  resourceType: 'client' | 'group';
  resourceId: string;
  isOpen: boolean;
  onClose: () => void;
}

// ShareLinkSettings - Configure share options
interface ShareLinkSettingsProps {
  options: ShareOptions;
  onChange: (options: ShareOptions) => void;
}
```

---

## 5. Routes

### Admin Routes (Protected)
| Route | Component | Description |
|-------|-----------|-------------|
| `/agency/groups` | GroupsListPage | List all groups |
| `/agency/groups/new` | GroupCreateModal | Create new group |
| `/agency/groups/:groupId/edit` | GroupEditPage | Edit group details & clients |

### Public/Shared Routes
| Route | Component | Description |
|-------|-----------|-------------|
| `/share/g/:token` | SharedGroupView | Public group view |
| `/share/c/:token` | SharedClientView | Public client view (enhanced) |

### Updates to Existing Routes
| Route | Change |
|-------|--------|
| `/agency` | Add "Groups" tab to navigation |
| `/dashboard/:clientId` | Add "Add to Group" button |

---

## 6. Sharing Flow

### Share a Group
1. User clicks "Share" on group
2. Modal opens with share options:
   - Link expiration (never, 7 days, 30 days, custom)
   - Password protection (optional)
   - Access level (view only)
3. System generates unique token
4. URL created: `https://app.com/share/g/{token}`
5. User can copy link, regenerate, or revoke

### Access a Shared Group
1. User visits `/share/g/{token}`
2. System validates token:
   - Check if token exists
   - Check if expired
   - Check if resource still exists
3. If password protected, show password modal
4. Display group view with client list
5. Track access count

### Share Individual Client from Group
1. In group view, each client has share button
2. Same flow as group share
3. URL: `/share/c/{token}`
4. Links back to group context if applicable

---

## 7. Implementation Phases

### Phase 1: Database & Backend Foundation
- [ ] Create migration files for `groups`, `group_clients`, `share_tokens`
- [ ] Extend DatabaseService with group methods
- [ ] Create GroupService with business logic
- [ ] Add share token validation logic

### Phase 2: React Hooks & State Management
- [ ] Create useGroups hook
- [ ] Create useGroup hook
- [ ] Create useSharedView hook
- [ ] Add React Query keys and caching

### Phase 3: Group Management UI
- [ ] Create GroupsListPage
- [ ] Create GroupCreateModal
- [ ] Create GroupEditPage with client management
- [ ] Add Groups tab to AgencyPanel

### Phase 4: Sharing System
- [ ] Create ShareLinkModal component
- [ ] Implement share token generation
- [ ] Create SharedGroupView page
- [ ] Enhance existing SharedClientView with tokens

### Phase 5: Integration & Polish
- [ ] Add "Add to Group" functionality to client dashboard
- [ ] Implement group-level PDF export
- [ ] Add drag-drop reordering
- [ ] Error handling and loading states

### Phase 6: Testing
- [ ] Unit tests for services
- [ ] Integration tests for sharing flow
- [ ] E2E tests for group management

---

## 8. API Endpoints (if needed)

If backend API routes are needed beyond Supabase direct access:

```
GET    /api/groups                    # List all groups
POST   /api/groups                    # Create group
GET    /api/groups/:id                # Get group details
PUT    /api/groups/:id                # Update group
DELETE /api/groups/:id                # Delete group
GET    /api/groups/:id/clients        # Get clients in group
POST   /api/groups/:id/clients        # Add client to group
DELETE /api/groups/:id/clients/:cid   # Remove client from group
PUT    /api/groups/:id/reorder        # Reorder clients

POST   /api/share                     # Create share token
GET    /api/share/:token/validate     # Validate token
DELETE /api/share/:token              # Revoke token
GET    /api/share/:token              # Get shared resource data
```

---

## 9. Security Considerations

1. **Token Generation**: Use cryptographically secure random tokens (32+ characters)
2. **Access Control**: Verify share tokens don't expose admin functionality
3. **Rate Limiting**: Limit share token validation attempts
4. **Data Exposure**: Shared views only expose necessary data
5. **Expiration**: Clean up expired tokens periodically

---

## 10. Migration Files

### Migration 001: Create Groups Tables
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Groups table
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    logo_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
    shareable_link VARCHAR(255) UNIQUE,
    share_config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Group-Client join table
CREATE TABLE group_clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, client_id)
);

-- Share tokens table
CREATE TABLE share_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token VARCHAR(255) UNIQUE NOT NULL,
    resource_type VARCHAR(20) NOT NULL CHECK (resource_type IN ('client', 'group')),
    resource_id UUID NOT NULL,
    access_level VARCHAR(20) DEFAULT 'view' CHECK (access_level IN ('view', 'edit')),
    expires_at TIMESTAMP WITH TIME ZONE,
    password_hash VARCHAR(255),
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID
);

-- Indexes
CREATE INDEX idx_groups_status ON groups(status);
CREATE INDEX idx_group_clients_group_id ON group_clients(group_id);
CREATE INDEX idx_group_clients_client_id ON group_clients(client_id);
CREATE INDEX idx_share_tokens_token ON share_tokens(token);
CREATE INDEX idx_share_tokens_resource ON share_tokens(resource_type, resource_id);
CREATE INDEX idx_share_tokens_expires ON share_tokens(expires_at);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Files to Create/Modify

### New Files
```
src/
├── services/
│   └── data/
│       ├── groupService.ts
│       └── shareTokenService.ts
├── hooks/
│   ├── useGroups.ts
│   ├── useGroup.ts
│   └── useSharedView.ts
├── components/
│   ├── groups/
│   │   ├── GroupCard.tsx
│   │   ├── GroupList.tsx
│   │   ├── GroupCreateModal.tsx
│   │   ├── GroupEditForm.tsx
│   │   ├── ClientSelector.tsx
│   │   ├── DraggableClientList.tsx
│   │   └── GroupShareModal.tsx
│   └── share/
│       ├── ShareLinkModal.tsx
│       ├── ShareLinkSettings.tsx
│       └── PasswordProtectedView.tsx
├── pages/
│   ├── GroupsListPage.tsx
│   ├── GroupEditPage.tsx
│   ├── SharedGroupView.tsx
│   └── SharedClientView.tsx (enhanced)
├── types/
│   └── groups.ts
supabase/
└── migrations/
    └── 001_create_groups_tables.sql
```

### Modified Files
```
src/
├── App.tsx (add routes)
├── services/
│   └── data/
│       └── databaseService.ts (add group methods)
├── components/
│   └── agency/
│       └── AgencyPanel.tsx (add Groups tab)
├── pages/
│   └── EventDashboard.tsx (add "Add to Group" button)
└── hooks/
    └── useDashboardActions.ts (enhance share functionality)
```

---

## Next Steps

1. Review and approve this plan
2. Create database migration files
3. Implement backend services (Phase 1)
4. Implement React hooks (Phase 2)
5. Build UI components (Phases 3-4)
6. Testing and refinement (Phases 5-6)
