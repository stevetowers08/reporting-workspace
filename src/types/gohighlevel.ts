import { z } from 'zod';

// GoHighLevel API Response Schemas
export const GHLContactSchema = z.object({
  id: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address1: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  companyName: z.string().optional(),
  website: z.string().optional(),
  tags: z.array(z.string()).optional(),
  source: z.string().optional(),
  assignedTo: z.string().optional(),
  dateAdded: z.string().optional(),
  dateUpdated: z.string().optional(),
  locationId: z.string().optional(),
  customFields: z.record(z.any()).optional(),
});

export const GHLCampaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['active', 'paused', 'completed', 'draft']),
  type: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budget: z.number().optional(),
  locationId: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const GHLOpportunitySchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  value: z.number().optional(),
  contactId: z.string().optional(),
  locationId: z.string().optional(),
  pipelineId: z.string().optional(),
  pipelineStageId: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const GHLPipelineSchema = z.object({
  id: z.string(),
  name: z.string(),
  stages: z.array(z.object({
    id: z.string(),
    name: z.string(),
    order: z.number(),
  })),
  locationId: z.string().optional(),
});

export const GHLWebhookSchema = z.object({
  id: z.string(),
  url: z.string(),
  events: z.array(z.string()),
  isActive: z.boolean(),
  locationId: z.string().optional(),
});

// Type exports
export type GHLContact = z.infer<typeof GHLContactSchema>;
export type GHLCampaign = z.infer<typeof GHLCampaignSchema>;
export type GHLOpportunity = z.infer<typeof GHLOpportunitySchema>;
export type GHLPipeline = z.infer<typeof GHLPipelineSchema>;
export type GHLWebhook = z.infer<typeof GHLWebhookSchema>;

// API Response wrapper
export interface GHLResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
  message?: string;
  success: boolean;
}

// Error response
export interface GHLError {
  message: string;
  code?: string;
  details?: any;
}
