import { ClientService, Client, ClientIntegrations } from '@/services/clientService';
import { faker } from '@faker-js/faker';

describe('ClientService', () => {
  // Test data isolation - each test creates its own data
  let mockClient: Client;
  let mockClientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>;

  beforeEach(() => {
    // Arrange - Create fresh test data for each test
    mockClientData = {
      name: faker.company.name(),
      industry: faker.company.buzzNoun(),
      status: 'active' as const,
      monthlySpend: faker.number.int({ min: 1000, max: 50000 }),
      lastReportSent: faker.date.recent().toISOString(),
      contactEmail: faker.internet.email(),
      contactName: faker.person.fullName(),
      contactPhone: faker.phone.number(),
      timezone: faker.location.timeZone(),
      currency: 'USD',
      integrations: {
        facebookAds: {
          accessToken: '',
          adAccountId: '',
          connected: false,
        },
        googleAds: {
          accessToken: '',
          customerId: '',
          developerToken: '',
          connected: false,
        },
        goHighLevel: {
          apiKey: '',
          locationId: '',
          connected: false,
        },
      },
      reportingSchedule: {
        weekly: true,
        monthly: true,
        customSchedules: [],
      },
    };
  });

  describe('getAllClients', () => {
    it('When getting all clients, then should return an array of clients', async () => {
      // Act
      const clients = await ClientService.getAllClients();

      // Assert
      expect(clients).toBeDefined();
      expect(Array.isArray(clients)).toBe(true);
      expect(clients.length).toBeGreaterThan(0);
      expect(clients[0]).toHaveProperty('id');
      expect(clients[0]).toHaveProperty('name');
      expect(clients[0]).toHaveProperty('status');
    });

    it('When getting all clients, then should return clients with all required properties', async () => {
      // Act
      const clients = await ClientService.getAllClients();

      // Assert
      clients.forEach(client => {
        expect(client).toHaveProperty('id');
        expect(client).toHaveProperty('name');
        expect(client).toHaveProperty('industry');
        expect(client).toHaveProperty('status');
        expect(client).toHaveProperty('monthlySpend');
        expect(client).toHaveProperty('contactEmail');
        expect(client).toHaveProperty('integrations');
        expect(client).toHaveProperty('reportingSchedule');
        expect(client).toHaveProperty('createdAt');
        expect(client).toHaveProperty('updatedAt');
      });
    });
  });

  describe('getClientById', () => {
    it('When getting client by valid ID, then should return the client', async () => {
      // Arrange
      const clients = await ClientService.getAllClients();
      const existingClient = clients[0];

      // Act
      const client = await ClientService.getClientById(existingClient.id);

      // Assert
      expect(client).toBeDefined();
      expect(client?.id).toBe(existingClient.id);
      expect(client?.name).toBe(existingClient.name);
    });

    it('When getting client by invalid ID, then should return null', async () => {
      // Arrange
      const invalidId = faker.string.uuid();

      // Act
      const client = await ClientService.getClientById(invalidId);

      // Assert
      expect(client).toBeNull();
    });

    it('When getting client by empty ID, then should return null', async () => {
      // Act
      const client = await ClientService.getClientById('');

      // Assert
      expect(client).toBeNull();
    });
  });

  describe('createClient', () => {
    it('When creating a new client, then should return client with generated ID and timestamps', async () => {
      // Act
      const newClient = await ClientService.createClient(mockClientData);

      // Assert
      expect(newClient).toBeDefined();
      expect(newClient.id).toBeDefined();
      expect(newClient.id).toMatch(/^client_\d+$/);
      expect(newClient.createdAt).toBeDefined();
      expect(newClient.updatedAt).toBeDefined();
      expect(new Date(newClient.createdAt)).toBeInstanceOf(Date);
      expect(new Date(newClient.updatedAt)).toBeInstanceOf(Date);
    });

    it('When creating a new client, then should include all provided data', async () => {
      // Act
      const newClient = await ClientService.createClient(mockClientData);

      // Assert
      expect(newClient.name).toBe(mockClientData.name);
      expect(newClient.industry).toBe(mockClientData.industry);
      expect(newClient.status).toBe(mockClientData.status);
      expect(newClient.monthlySpend).toBe(mockClientData.monthlySpend);
      expect(newClient.contactEmail).toBe(mockClientData.contactEmail);
      expect(newClient.contactName).toBe(mockClientData.contactName);
      expect(newClient.integrations).toEqual(mockClientData.integrations);
      expect(newClient.reportingSchedule).toEqual(mockClientData.reportingSchedule);
    });

    it('When creating multiple clients, then should generate unique IDs', async () => {
      // Act
      const client1 = await ClientService.createClient(mockClientData);
      // Add a small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));
      const client2 = await ClientService.createClient({
        ...mockClientData,
        name: faker.company.name(),
      });

      // Assert
      expect(client1.id).not.toBe(client2.id);
    });
  });

  describe('updateClient', () => {
    beforeEach(async () => {
      mockClient = await ClientService.createClient(mockClientData);
    });

    it('When updating existing client, then should return updated client', async () => {
      // Arrange
      const updates = {
        name: faker.company.name(),
        monthlySpend: faker.number.int({ min: 1000, max: 50000 }),
      };

      // Act
      const updatedClient = await ClientService.updateClient(mockClient.id, updates);

      // Assert
      expect(updatedClient).toBeDefined();
      expect(updatedClient?.name).toBe(updates.name);
      expect(updatedClient?.monthlySpend).toBe(updates.monthlySpend);
      expect(updatedClient?.updatedAt).not.toBe(mockClient.updatedAt);
    });

    it('When updating non-existent client, then should return null', async () => {
      // Arrange
      const invalidId = faker.string.uuid();
      const updates = { name: faker.company.name() };

      // Act
      const result = await ClientService.updateClient(invalidId, updates);

      // Assert
      expect(result).toBeNull();
    });

    it('When updating client with empty updates, then should return client with same data but updated timestamp', async () => {
      // Arrange
      const originalUpdatedAt = mockClient.updatedAt;
      
      // Act - Add a small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1));
      const updatedClient = await ClientService.updateClient(mockClient.id, {});

      // Assert
      expect(updatedClient).toBeDefined();
      expect(updatedClient?.name).toBe(mockClient.name);
      expect(updatedClient?.updatedAt).not.toBe(originalUpdatedAt);
      expect(new Date(updatedClient?.updatedAt || '').getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime()
      );
    });
  });

  describe('deleteClient', () => {
    beforeEach(async () => {
      mockClient = await ClientService.createClient(mockClientData);
    });

    it('When deleting existing client, then should return true', async () => {
      // Act
      const result = await ClientService.deleteClient(mockClient.id);

      // Assert
      expect(result).toBe(true);
    });

    it('When deleting non-existent client, then should return false', async () => {
      // Arrange
      const invalidId = faker.string.uuid();

      // Act
      const result = await ClientService.deleteClient(invalidId);

      // Assert
      expect(result).toBe(false);
    });

    it('When deleting client, then client should not be retrievable', async () => {
      // Act
      await ClientService.deleteClient(mockClient.id);
      const deletedClient = await ClientService.getClientById(mockClient.id);

      // Assert
      expect(deletedClient).toBeNull();
    });
  });

  describe('updateIntegrations', () => {
    beforeEach(async () => {
      mockClient = await ClientService.createClient(mockClientData);
    });

    it('When updating integrations for existing client, then should return updated client', async () => {
      // Arrange
      const integrationUpdates: Partial<ClientIntegrations> = {
        facebookAds: {
          accessToken: faker.string.alphanumeric(32),
          adAccountId: faker.string.alphanumeric(16),
          connected: true,
          lastSync: new Date().toISOString(),
        },
      };

      // Act
      const updatedClient = await ClientService.updateIntegrations(
        mockClient.id,
        integrationUpdates
      );

      // Assert
      expect(updatedClient).toBeDefined();
      expect(updatedClient?.integrations.facebookAds?.connected).toBe(true);
      expect(updatedClient?.integrations.facebookAds?.accessToken).toBe(
        integrationUpdates.facebookAds?.accessToken
      );
    });

    it('When updating integrations for non-existent client, then should return null', async () => {
      // Arrange
      const invalidId = faker.string.uuid();
      const integrationUpdates: Partial<ClientIntegrations> = {
        facebookAds: { accessToken: 'test', adAccountId: 'test', connected: true },
      };

      // Act
      const result = await ClientService.updateIntegrations(invalidId, integrationUpdates);

      // Assert
      expect(result).toBeNull();
    });

    it('When updating partial integrations, then should merge with existing integrations', async () => {
      // Arrange
      const integrationUpdates: Partial<ClientIntegrations> = {
        googleAds: {
          accessToken: faker.string.alphanumeric(32),
          customerId: faker.string.alphanumeric(16),
          developerToken: faker.string.alphanumeric(32),
          connected: true,
        },
      };

      // Act
      const updatedClient = await ClientService.updateIntegrations(
        mockClient.id,
        integrationUpdates
      );

      // Assert
      expect(updatedClient).toBeDefined();
      expect(updatedClient?.integrations.googleAds?.connected).toBe(true);
      expect(updatedClient?.integrations.facebookAds).toEqual(
        mockClient.integrations.facebookAds
      );
    });
  });

  describe('testIntegrations', () => {
    beforeEach(async () => {
      mockClient = await ClientService.createClient(mockClientData);
    });

    it('When testing integrations for existing client, then should return test results', async () => {
      // Act
      const results = await ClientService.testIntegrations(mockClient.id);

      // Assert
      expect(results).toBeDefined();
      expect(results).toHaveProperty('facebookAds');
      expect(results).toHaveProperty('googleAds');
      expect(results).toHaveProperty('goHighLevel');
      expect(typeof results.facebookAds).toBe('boolean');
      expect(typeof results.googleAds).toBe('boolean');
      expect(typeof results.goHighLevel).toBe('boolean');
    });

    it('When testing integrations for non-existent client, then should throw error', async () => {
      // Arrange
      const invalidId = faker.string.uuid();

      // Act & Assert
      await expect(ClientService.testIntegrations(invalidId)).rejects.toThrow(
        'Client not found'
      );
    });

    it('When testing integrations with no credentials, then should return false for all', async () => {
      // Act
      const results = await ClientService.testIntegrations(mockClient.id);

      // Assert
      expect(results.facebookAds).toBe(false);
      expect(results.googleAds).toBe(false);
      expect(results.goHighLevel).toBe(false);
    });
  });
});
