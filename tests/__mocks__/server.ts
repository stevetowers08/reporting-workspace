import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { mockApiResponses } from './testUtils';

// Create MSW server for API mocking
export const server = setupServer(
  // Client endpoints
  rest.get('/api/clients', (req, res, ctx) => {
    return res(ctx.json(mockApiResponses.clients));
  }),
  
  rest.get('/api/clients/:id', (req, res, ctx) => {
    const { id } = req.params;
    const client = mockApiResponses.clients.find(c => c.id === id);
    
    if (!client) {
      return res(ctx.status(404), ctx.json({ error: 'Client not found' }));
    }
    
    return res(ctx.json(client));
  }),
  
  rest.post('/api/clients', (req, res, ctx) => {
    const newClient = {
      ...req.body,
      id: `client_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    return res(ctx.status(201), ctx.json(newClient));
  }),
  
  rest.put('/api/clients/:id', (req, res, ctx) => {
    const { id } = req.params;
    const client = mockApiResponses.clients.find(c => c.id === id);
    
    if (!client) {
      return res(ctx.status(404), ctx.json({ error: 'Client not found' }));
    }
    
    const updatedClient = {
      ...client,
      ...req.body,
      updatedAt: new Date().toISOString(),
    };
    
    return res(ctx.json(updatedClient));
  }),
  
  rest.delete('/api/clients/:id', (req, res, ctx) => {
    const { id } = req.params;
    const clientIndex = mockApiResponses.clients.findIndex(c => c.id === id);
    
    if (clientIndex === -1) {
      return res(ctx.status(404), ctx.json({ error: 'Client not found' }));
    }
    
    return res(ctx.status(204));
  }),
  
  // Campaign endpoints
  rest.get('/api/campaigns', (req, res, ctx) => {
    return res(ctx.json(mockApiResponses.campaigns));
  }),
  
  rest.get('/api/campaigns/:id', (req, res, ctx) => {
    const { id } = req.params;
    const campaign = mockApiResponses.campaigns.find(c => c.id === id);
    
    if (!campaign) {
      return res(ctx.status(404), ctx.json({ error: 'Campaign not found' }));
    }
    
    return res(ctx.json(campaign));
  }),
  
  // Ad Account endpoints
  rest.get('/api/ad-accounts', (req, res, ctx) => {
    return res(ctx.json(mockApiResponses.adAccounts));
  }),
  
  // Facebook Ads API endpoints
  rest.get('/api/facebook/campaigns', (req, res, ctx) => {
    return res(ctx.json(mockApiResponses.campaigns));
  }),
  
  rest.get('/api/facebook/ad-accounts', (req, res, ctx) => {
    return res(ctx.json(mockApiResponses.adAccounts));
  }),
  
  // Google Ads API endpoints
  rest.get('/api/google/campaigns', (req, res, ctx) => {
    return res(ctx.json(mockApiResponses.campaigns));
  }),
  
  rest.get('/api/google/customers', (req, res, ctx) => {
    return res(ctx.json(mockApiResponses.adAccounts));
  }),
  
  // OAuth endpoints
  rest.post('/api/auth/facebook', (req, res, ctx) => {
    return res(ctx.json({
      accessToken: 'mock_facebook_token',
      expiresIn: 3600,
    }));
  }),
  
  rest.post('/api/auth/google', (req, res, ctx) => {
    return res(ctx.json({
      accessToken: 'mock_google_token',
      expiresIn: 3600,
    }));
  }),
  
  // Integration test endpoints
  rest.post('/api/integrations/test', (req, res, ctx) => {
    return res(ctx.json({
      facebookAds: true,
      googleAds: true,
      goHighLevel: false,
    }));
  }),
  
  // Error simulation endpoints
  rest.get('/api/error', (req, res, ctx) => {
    return res(ctx.status(500), ctx.json({ error: 'Internal server error' }));
  }),
  
  rest.get('/api/timeout', (req, res, ctx) => {
    return res(ctx.delay('infinite'));
  }),
  
  // Catch-all handler for unhandled requests
  rest.get('*', (req, res, ctx) => {
    console.warn(`Unhandled request: ${req.method} ${req.url}`);
    return res(ctx.status(404), ctx.json({ error: 'Not found' }));
  }),
  
  rest.post('*', (req, res, ctx) => {
    console.warn(`Unhandled request: ${req.method} ${req.url}`);
    return res(ctx.status(404), ctx.json({ error: 'Not found' }));
  }),
  
  rest.put('*', (req, res, ctx) => {
    console.warn(`Unhandled request: ${req.method} ${req.url}`);
    return res(ctx.status(404), ctx.json({ error: 'Not found' }));
  }),
  
  rest.delete('*', (req, res, ctx) => {
    console.warn(`Unhandled request: ${req.method} ${req.url}`);
    return res(ctx.status(404), ctx.json({ error: 'Not found' }));
  }),
);

// Export server for use in tests
export default server;