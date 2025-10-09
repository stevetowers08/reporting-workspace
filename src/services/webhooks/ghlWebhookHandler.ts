import { debugLogger } from '@/lib/debug';
import { GoHighLevelService } from '@/services/ghl/goHighLevelService';
import { Request, Response } from 'express';

export interface GHLWebhookEvent {
  type: string;
  locationId: string;
  data: any;
  timestamp: string;
}

export class GHLWebhookHandler {
  /**
   * Handle incoming GHL webhooks
   */
  static async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['x-hub-signature-256'] as string;
      const payload = JSON.stringify(req.body);

      debugLogger.info('GHLWebhookHandler', 'Received webhook', {
        hasSignature: !!signature,
        payloadSize: payload.length
      });

      // Verify webhook signature
      const isValid = GoHighLevelService.verifyWebhookSignature();
      
      if (!isValid) {
        debugLogger.error('GHLWebhookHandler', 'Invalid webhook signature');
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }

      const event: GHLWebhookEvent = req.body;
      
      debugLogger.info('GHLWebhookHandler', 'Processing webhook event', {
        type: event.type,
        locationId: event.locationId
      });

      // Process different event types
      await this.processWebhookEvent(event);

      res.status(200).json({ success: true });
    } catch (error) {
      debugLogger.error('GHLWebhookHandler', 'Webhook processing failed', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  /**
   * Process different types of webhook events
   */
  private static async processWebhookEvent(event: GHLWebhookEvent): Promise<void> {
    try {
      switch (event.type) {
        case 'ContactCreated':
        case 'ContactUpdated':
          await this.handleContactEvent(event);
          break;
        
        case 'OpportunityCreated':
        case 'OpportunityUpdated':
          await this.handleOpportunityEvent(event);
          break;
        
        case 'AppointmentCreated':
        case 'AppointmentUpdated':
          await this.handleAppointmentEvent(event);
          break;
        
        case 'CampaignCreated':
        case 'CampaignUpdated':
          await this.handleCampaignEvent(event);
          break;
        
        default:
          debugLogger.info('GHLWebhookHandler', 'Unhandled webhook event type', {
            type: event.type
          });
      }
    } catch (error) {
      debugLogger.error('GHLWebhookHandler', 'Error processing webhook event', error);
      throw error;
    }
  }

  /**
   * Handle contact-related events
   */
  private static async handleContactEvent(event: GHLWebhookEvent): Promise<void> {
    debugLogger.info('GHLWebhookHandler', 'Processing contact event', {
      type: event.type,
      contactId: event.data?.id
    });

    // TODO: Update contact data in your database
    // await DatabaseService.updateContact(event.locationId, event.data);
  }

  /**
   * Handle opportunity-related events
   */
  private static async handleOpportunityEvent(event: GHLWebhookEvent): Promise<void> {
    debugLogger.info('GHLWebhookHandler', 'Processing opportunity event', {
      type: event.type,
      opportunityId: event.data?.id
    });

    // TODO: Update opportunity data in your database
    // await DatabaseService.updateOpportunity(event.locationId, event.data);
  }

  /**
   * Handle appointment-related events
   */
  private static async handleAppointmentEvent(event: GHLWebhookEvent): Promise<void> {
    debugLogger.info('GHLWebhookHandler', 'Processing appointment event', {
      type: event.type,
      appointmentId: event.data?.id
    });

    // TODO: Update appointment data in your database
    // await DatabaseService.updateAppointment(event.locationId, event.data);
  }

  /**
   * Handle campaign-related events
   */
  private static async handleCampaignEvent(event: GHLWebhookEvent): Promise<void> {
    debugLogger.info('GHLWebhookHandler', 'Processing campaign event', {
      type: event.type,
      campaignId: event.data?.id
    });

    // TODO: Update campaign data in your database
    // await DatabaseService.updateCampaign(event.locationId, event.data);
  }

  /**
   * Setup webhook endpoint for a location
   */
  static async setupWebhook(locationId: string, webhookUrl: string): Promise<void> {
    try {
      const events = [
        'ContactCreated',
        'ContactUpdated',
        'OpportunityCreated',
        'OpportunityUpdated',
        'AppointmentCreated',
        'AppointmentUpdated',
        'CampaignCreated',
        'CampaignUpdated'
      ];

      await GoHighLevelService.setupWebhook(locationId, webhookUrl, events);
      
      debugLogger.info('GHLWebhookHandler', 'Webhook setup completed', {
        locationId,
        webhookUrl,
        events
      });
    } catch (error) {
      debugLogger.error('GHLWebhookHandler', 'Failed to setup webhook', error);
      throw error;
    }
  }
}
