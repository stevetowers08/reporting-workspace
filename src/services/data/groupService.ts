/**
 * GroupService - Business logic for managing groups of clients
 */

import { supabase } from '@/lib/supabase';
import { debugLogger } from '@/lib/debug';
import { Client } from './databaseService';
import {
  Group,
  GroupWithClients,
  GroupClient,
  CreateGroupRequest,
  UpdateGroupRequest,
  ShareOptions,
  CreateShareLinkResponse,
  SharedGroupData,
  ShareValidationResult,
  ResourceType,
} from '@/types/groups';

// Debug helper
const debug = {
  log: (action: string, data?: unknown) => {
    debugLogger.debug('GroupService', action, data);
  },
  error: (action: string, error: unknown) => {
    debugLogger.error('GroupService', action, error);
  },
};

// ============================================================================
// Group CRUD Operations
// ============================================================================

/**
 * Get all groups with optional filtering
 * Uses group_summary view to include client_count
 */
export async function getAllGroups(status?: 'active' | 'paused' | 'archived'): Promise<Group[]> {
  debug.log('getAllGroups called', { status });
  
  let query = supabase
    .from('group_summary')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (status) {
    query = query.eq('status', status);
  }
  
  const { data, error } = await query;
  
  if (error) {
    debug.error('getAllGroups failed', error);
    throw new Error(`Failed to fetch groups: ${error.message}`);
  }
  
  return data || [];
}

/**
 * Get a single group by ID
 */
export async function getGroup(id: string): Promise<Group | null> {
  debug.log('getGroup called', { id });
  
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  
  if (error) {
    debug.error('getGroup failed', error);
    throw new Error(`Failed to fetch group: ${error.message}`);
  }
  
  return data;
}

/**
 * Get a group with all its clients
 */
export async function getGroupWithClients(id: string): Promise<GroupWithClients | null> {
  debug.log('getGroupWithClients called', { id });
  
  // Get group
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  
  if (groupError) {
    debug.error('getGroupWithClients - group fetch failed', groupError);
    throw new Error(`Failed to fetch group: ${groupError.message}`);
  }
  
  if (!group) return null;
  
  // Get clients with their display order
  const { data: groupClients, error: clientsError } = await supabase
    .from('group_clients')
    .select(`
      *,
      client:clients(*)
    `)
    .eq('group_id', id)
    .order('display_order', { ascending: true });
  
  if (clientsError) {
    debug.error('getGroupWithClients - clients fetch failed', clientsError);
    throw new Error(`Failed to fetch group clients: ${clientsError.message}`);
  }
  
  // Extract clients from the joined data
  const clients = (groupClients || [])
    .map(gc => ({
      ...(gc.client as unknown as Client),
      display_order: gc.display_order,
    }))
    .filter(c => c.id); // Filter out any null clients
  
  return {
    ...group,
    clients,
    client_count: clients.length,
  };
}

/**
 * Create a new group
 */
export async function createGroup(request: CreateGroupRequest): Promise<Group> {
  debug.log('createGroup called', { name: request.name });
  
  // Start a transaction by using RPC or multiple calls
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert({
      name: request.name,
      description: request.description,
      logo_url: request.logo_url,
      status: 'active',
    })
    .select()
    .single();
  
  if (groupError) {
    debug.error('createGroup failed', groupError);
    throw new Error(`Failed to create group: ${groupError.message}`);
  }
  
  // If client IDs provided, add them to the group
  if (request.clientIds && request.clientIds.length > 0) {
    await addClientsToGroup(group.id, request.clientIds);
  }
  
  debug.log('createGroup succeeded', { id: group.id });
  return group;
}

/**
 * Update a group
 */
export async function updateGroup(id: string, updates: UpdateGroupRequest): Promise<Group> {
  debug.log('updateGroup called', { id, updates });
  
  const { data, error } = await supabase
    .from('groups')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    debug.error('updateGroup failed', error);
    throw new Error(`Failed to update group: ${error.message}`);
  }
  
  return data;
}

/**
 * Delete a group (this will cascade delete group_clients due to FK constraint)
 */
export async function deleteGroup(id: string): Promise<void> {
  debug.log('deleteGroup called', { id });
  
  // Delete associated share tokens first
  await supabase
    .from('share_tokens')
    .delete()
    .eq('resource_type', 'group')
    .eq('resource_id', id);
  
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', id);
  
  if (error) {
    debug.error('deleteGroup failed', error);
    throw new Error(`Failed to delete group: ${error.message}`);
  }
}

// ============================================================================
// Group-Client Relationship Operations
// ============================================================================

/**
 * Get all clients in a group
 */
export async function getGroupClients(groupId: string): Promise<GroupClient[]> {
  debug.log('getGroupClients called', { groupId });
  
  const { data, error } = await supabase
    .from('group_clients')
    .select(`
      *,
      client:clients(*)
    `)
    .eq('group_id', groupId)
    .order('display_order', { ascending: true });
  
  if (error) {
    debug.error('getGroupClients failed', error);
    throw new Error(`Failed to fetch group clients: ${error.message}`);
  }
  
  return (data || []).map(gc => ({
    ...gc,
    client: gc.client as unknown as Client,
  }));
}

/**
 * Add a single client to a group
 */
export async function addClientToGroup(groupId: string, clientId: string, displayOrder?: number): Promise<void> {
  debug.log('addClientToGroup called', { groupId, clientId, displayOrder });
  
  // If displayOrder not provided, get the max and add 1
  if (displayOrder === undefined) {
    const { data } = await supabase
      .from('group_clients')
      .select('display_order')
      .eq('group_id', groupId)
      .order('display_order', { ascending: false })
      .limit(1);
    
    displayOrder = (data?.[0]?.display_order ?? -1) + 1;
  }
  
  const { error } = await supabase
    .from('group_clients')
    .insert({
      group_id: groupId,
      client_id: clientId,
      display_order: displayOrder,
    });
  
  if (error) {
    // Handle duplicate entry gracefully
    if (error.code === '23505') {
      throw new Error('Client is already in this group');
    }
    debug.error('addClientToGroup failed', error);
    throw new Error(`Failed to add client to group: ${error.message}`);
  }
}

/**
 * Add multiple clients to a group
 */
export async function addClientsToGroup(groupId: string, clientIds: string[]): Promise<void> {
  debug.log('addClientsToGroup called', { groupId, count: clientIds.length });
  
  // Get current max display order
  const { data } = await supabase
    .from('group_clients')
    .select('display_order')
    .eq('group_id', groupId)
    .order('display_order', { ascending: false })
    .limit(1);
  
  let startOrder = (data?.[0]?.display_order ?? -1) + 1;
  
  // Insert clients
  const inserts = clientIds.map((clientId, index) => ({
    group_id: groupId,
    client_id: clientId,
    display_order: startOrder + index,
  }));
  
  const { error } = await supabase
    .from('group_clients')
    .insert(inserts);
  
  if (error) {
    debug.error('addClientsToGroup failed', error);
    throw new Error(`Failed to add clients to group: ${error.message}`);
  }
}

/**
 * Remove a client from a group
 */
export async function removeClientFromGroup(groupId: string, clientId: string): Promise<void> {
  debug.log('removeClientFromGroup called', { groupId, clientId });
  
  const { error } = await supabase
    .from('group_clients')
    .delete()
    .eq('group_id', groupId)
    .eq('client_id', clientId);
  
  if (error) {
    debug.error('removeClientFromGroup failed', error);
    throw new Error(`Failed to remove client from group: ${error.message}`);
  }
}

/**
 * Reorder clients within a group
 */
export async function reorderGroupClients(
  groupId: string, 
  clientOrders: { clientId: string; order: number }[]
): Promise<void> {
  debug.log('reorderGroupClients called', { groupId, count: clientOrders.length });
  
  // Update each client's display order
  const updates = clientOrders.map(({ clientId, order }) =>
    supabase
      .from('group_clients')
      .update({ display_order: order })
      .eq('group_id', groupId)
      .eq('client_id', clientId)
  );
  
  const results = await Promise.all(updates);
  
  // Check for errors
  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    debug.error('reorderGroupClients failed', errors);
    throw new Error('Failed to reorder clients');
  }
}

// ============================================================================
// Sharing Operations
// ============================================================================

/**
 * Generate a cryptographically secure random token
 */
function generateSecureToken(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Hash a password for share token protection
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Create a share link for a resource (group or client)
 */
export async function createShareLink(
  resourceType: ResourceType,
  resourceId: string,
  options: ShareOptions = {}
): Promise<CreateShareLinkResponse> {
  debug.log('createShareLink called', { resourceType, resourceId });
  
  const token = generateSecureToken();
  
  // Calculate expiration
  let expiresAt: string | undefined;
  if (options.expiration && options.expiration !== 'never') {
    const now = new Date();
    switch (options.expiration) {
      case '7days':
        now.setDate(now.getDate() + 7);
        break;
      case '30days':
        now.setDate(now.getDate() + 30);
        break;
      case '90days':
        now.setDate(now.getDate() + 90);
        break;
      case 'custom':
        if (options.customExpirationDate) {
          expiresAt = options.customExpirationDate;
        }
        break;
    }
    if (!expiresAt) {
      expiresAt = now.toISOString();
    }
  }
  
  // Hash password if provided
  let passwordHash: string | undefined;
  if (options.password) {
    passwordHash = await hashPassword(options.password);
  }
  
  // Store token in database
  const { error } = await supabase
    .from('share_tokens')
    .insert({
      token,
      resource_type: resourceType,
      resource_id: resourceId,
      access_level: options.accessLevel || 'view',
      expires_at: expiresAt,
      password_hash: passwordHash,
    });
  
  if (error) {
    debug.error('createShareLink failed', error);
    throw new Error(`Failed to create share link: ${error.message}`);
  }
  
  // Update the group's shareable_link if it's a group
  if (resourceType === 'group') {
    await supabase
      .from('groups')
      .update({ shareable_link: token })
      .eq('id', resourceId);
  }
  
  const shareUrl = `${window.location.origin}/share/${resourceType === 'group' ? 'g' : 'c'}/${token}`;
  
  return {
    token,
    shareUrl,
    expiresAt,
  };
}

/**
 * Validate a share token and return the associated resource
 */
export async function validateShareToken(token: string): Promise<ShareValidationResult | null> {
  debug.log('validateShareToken called', { token: token.substring(0, 8) + '...' });
  
  const { data: shareToken, error } = await supabase
    .from('share_tokens')
    .select('*')
    .eq('token', token)
    .maybeSingle();
  
  if (error || !shareToken) {
    debug.error('validateShareToken - token not found', error);
    return null;
  }
  
  // Check expiration
  if (shareToken.expires_at && new Date(shareToken.expires_at) < new Date()) {
    debug.log('validateShareToken - token expired');
    return null;
  }
  
  // Update access count and last accessed
  await supabase
    .from('share_tokens')
    .update({
      access_count: (shareToken.access_count || 0) + 1,
      last_accessed_at: new Date().toISOString(),
    })
    .eq('id', shareToken.id);
  
  // Fetch the resource
  let resource: unknown;
  if (shareToken.resource_type === 'group') {
    resource = await getGroupWithClients(shareToken.resource_id);
  } else {
    // Fetch client
    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('id', shareToken.resource_id)
      .maybeSingle();
    resource = client;
  }
  
  if (!resource) {
    debug.error('validateShareToken - resource not found', null);
    return null;
  }
  
  return {
    valid: true,
    token: shareToken as unknown as ShareValidationResult['token'],
    resource: resource as ShareValidationResult['resource'],
    requiresPassword: !!shareToken.password_hash,
  };
}

/**
 * Verify password for a protected share token
 */
export async function verifySharePassword(token: string, password: string): Promise<boolean> {
  debug.log('verifySharePassword called');
  
  const { data: shareToken, error } = await supabase
    .from('share_tokens')
    .select('password_hash')
    .eq('token', token)
    .maybeSingle();
  
  if (error || !shareToken || !shareToken.password_hash) {
    return false;
  }
  
  const passwordHash = await hashPassword(password);
  return passwordHash === shareToken.password_hash;
}

/**
 * Revoke a share token
 */
export async function revokeShareToken(token: string): Promise<void> {
  debug.log('revokeShareToken called', { token: token.substring(0, 8) + '...' });
  
  // Get the token to find the resource
  const { data: shareToken } = await supabase
    .from('share_tokens')
    .select('*')
    .eq('token', token)
    .maybeSingle();
  
  // Delete the token
  const { error } = await supabase
    .from('share_tokens')
    .delete()
    .eq('token', token);
  
  if (error) {
    debug.error('revokeShareToken failed', error);
    throw new Error(`Failed to revoke share token: ${error.message}`);
  }
  
  // Clear shareable_link if it's a group
  if (shareToken && shareToken.resource_type === 'group') {
    await supabase
      .from('groups')
      .update({ shareable_link: null })
      .eq('id', shareToken.resource_id);
  }
}

/**
 * Get all share tokens for a resource
 */
export async function getShareTokensForResource(
  resourceType: ResourceType,
  resourceId: string
): Promise<unknown[]> {
  debug.log('getShareTokensForResource called', { resourceType, resourceId });
  
  const { data, error } = await supabase
    .from('share_tokens')
    .select('*')
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId)
    .order('created_at', { ascending: false });
  
  if (error) {
    debug.error('getShareTokensForResource failed', error);
    throw new Error(`Failed to fetch share tokens: ${error.message}`);
  }
  
  return data || [];
}

// ============================================================================
// Shared View Data
// ============================================================================

/**
 * Get shared group data for public viewing
 * Accepts either a share token or a group ID (for internal sharing)
 */
export async function getSharedGroupData(tokenOrId: string): Promise<SharedGroupData | null> {
  debug.log('getSharedGroupData called');

  // Try to validate as a token first
  const validation = await validateShareToken(tokenOrId);

  let groupWithClients: GroupWithClients | null = null;

  if (validation && validation.valid && validation.token.resource_type === 'group') {
    // Valid token - use the validated resource
    groupWithClients = validation.resource as GroupWithClients;
  } else {
    // Not a valid token - try treating it as a group ID (for internal sharing)
    debug.log('Not a valid token, trying as group ID');
    groupWithClients = await getGroupWithClients(tokenOrId);
  }

  if (!groupWithClients) {
    return null;
  }

  return {
    group: {
      id: groupWithClients.id,
      name: groupWithClients.name,
      description: groupWithClients.description,
      logo_url: groupWithClients.logo_url,
      status: groupWithClients.status,
      share_config: groupWithClients.share_config,
      created_at: groupWithClients.created_at,
      updated_at: groupWithClients.updated_at,
      shareable_link: groupWithClients.shareable_link,
    },
    clients: groupWithClients.clients.map(c => ({
      id: c.id,
      name: c.name,
      logo_url: c.logo_url,
      status: c.status,
    } as Client)),
    shareConfig: groupWithClients.share_config || {},
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Clone an existing group with a new name
 */
export async function cloneGroup(groupId: string, newName: string): Promise<Group> {
  debug.log('cloneGroup called', { groupId, newName });
  
  // Get the original group with clients
  const originalGroup = await getGroupWithClients(groupId);
  
  if (!originalGroup) {
    throw new Error('Source group not found');
  }
  
  // Create new group
  const newGroup = await createGroup({
    name: newName,
    description: originalGroup.description,
    logo_url: originalGroup.logo_url,
    clientIds: originalGroup.clients.map(c => c.id),
  });
  
  debug.log('cloneGroup succeeded', { originalId: groupId, newId: newGroup.id });
  return newGroup;
}

/**
 * Get groups that contain a specific client
 */
export async function getGroupsForClient(clientId: string): Promise<Group[]> {
  debug.log('getGroupsForClient called', { clientId });
  
  const { data, error } = await supabase
    .from('group_clients')
    .select(`
      group:groups(*)
    `)
    .eq('client_id', clientId);
  
  if (error) {
    debug.error('getGroupsForClient failed', error);
    throw new Error(`Failed to fetch groups for client: ${error.message}`);
  }
  
  return (data || []).map(gc => (gc.group as unknown as Group));
}
