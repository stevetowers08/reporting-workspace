import { ClientService } from '@/services/clientService';
import { faker } from '@faker-js/faker';

describe('ClientService Integration Tests', () => {
  describe('When performing complete client lifecycle operations', () => {
    it('Then should handle full CRUD operations successfully', async () => {
      // Arrange - Create initial client data
      const initialClientData = {
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

      // Act & Assert - Create client
      const createdClient = await ClientService.createClient(initialClientData);
      expect(createdClient).toBeDefined();
      expect(createdClient.id).toBeDefined();
      expect(createdClient.name).toBe(initialClientData.name);

      // Act & Assert - Retrieve client
      const retrievedClient = await ClientService.getClientById(createdClient.id);
      expect(retrievedClient).toBeDefined();
      expect(retrievedClient?.id).toBe(createdClient.id);
      expect(retrievedClient?.name).toBe(createdClient.name);

      // Act & Assert - Update client
      const updateData = {
        name: faker.company.name(),
        monthlySpend: faker.number.int({ min: 1000, max: 50000 }),
        status: 'paused' as const,
      };
      const updatedClient = await ClientService.updateClient(createdClient.id, updateData);
      expect(updatedClient).toBeDefined();
      expect(updatedClient?.name).toBe(updateData.name);
      expect(updatedClient?.monthlySpend).toBe(updateData.monthlySpend);
      expect(updatedClient?.status).toBe(updateData.status);

      // Act & Assert - Update integrations
      const integrationUpdates = {
        facebookAds: {
          accessToken: faker.string.alphanumeric(32),
          adAccountId: faker.string.alphanumeric(16),
          connected: true,
          lastSync: new Date().toISOString(),
        },
        googleAds: {
          accessToken: faker.string.alphanumeric(32),
          customerId: faker.string.alphanumeric(16),
          developerToken: faker.string.alphanumeric(32),
          connected: true,
          lastSync: new Date().toISOString(),
        },
      };
      const clientWithIntegrations = await ClientService.updateIntegrations(
        createdClient.id,
        integrationUpdates
      );
      expect(clientWithIntegrations).toBeDefined();
      expect(clientWithIntegrations?.integrations.facebookAds?.connected).toBe(true);
      expect(clientWithIntegrations?.integrations.googleAds?.connected).toBe(true);

      // Act & Assert - Test integrations
      const integrationTestResults = await ClientService.testIntegrations(createdClient.id);
      expect(integrationTestResults).toBeDefined();
      expect(integrationTestResults).toHaveProperty('facebookAds');
      expect(integrationTestResults).toHaveProperty('googleAds');
      expect(integrationTestResults).toHaveProperty('goHighLevel');

      // Act & Assert - Delete client
      const deleteResult = await ClientService.deleteClient(createdClient.id);
      expect(deleteResult).toBe(true);

      // Act & Assert - Verify client is deleted
      const deletedClient = await ClientService.getClientById(createdClient.id);
      expect(deletedClient).toBeNull();
    });

    it('Then should handle multiple clients operations', async () => {
      // Arrange - Create multiple clients
      const client1Data = {
        name: faker.company.name(),
        industry: faker.company.buzzNoun(),
        status: 'active' as const,
        monthlySpend: faker.number.int({ min: 1000, max: 50000 }),
        lastReportSent: faker.date.recent().toISOString(),
        contactEmail: faker.internet.email(),
        contactName: faker.person.fullName(),
        timezone: faker.location.timeZone(),
        currency: 'USD',
        integrations: {
          facebookAds: { accessToken: '', adAccountId: '', connected: false },
          googleAds: { accessToken: '', customerId: '', developerToken: '', connected: false },
          goHighLevel: { apiKey: '', locationId: '', connected: false },
        },
        reportingSchedule: { weekly: true, monthly: true, customSchedules: [] },
      };

      const client2Data = {
        ...client1Data,
        name: faker.company.name(),
        contactEmail: faker.internet.email(),
      };

      // Act - Create clients
      const client1 = await ClientService.createClient(client1Data);
      // Add a small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));
      const client2 = await ClientService.createClient(client2Data);

      // Assert - Both clients created successfully
      expect(client1.id).not.toBe(client2.id);
      expect(client1.name).toBe(client1Data.name);
      expect(client2.name).toBe(client2Data.name);

      // Act - Get all clients
      const allClients = await ClientService.getAllClients();

      // Assert - Both clients are in the list
      const client1InList = allClients.find(c => c.id === client1.id);
      const client2InList = allClients.find(c => c.id === client2.id);
      expect(client1InList).toBeDefined();
      expect(client2InList).toBeDefined();

      // Act - Update both clients
      const client1Update = { status: 'paused' as const };
      const client2Update = { status: 'inactive' as const };

      const updatedClient1 = await ClientService.updateClient(client1.id, client1Update);
      const updatedClient2 = await ClientService.updateClient(client2.id, client2Update);

      // Assert - Both clients updated successfully
      expect(updatedClient1?.status).toBe('paused');
      expect(updatedClient2?.status).toBe('inactive');

      // Act - Delete both clients
      const delete1Result = await ClientService.deleteClient(client1.id);
      const delete2Result = await ClientService.deleteClient(client2.id);

      // Assert - Both clients deleted successfully
      expect(delete1Result).toBe(true);
      expect(delete2Result).toBe(true);
    });

    it('Then should handle error scenarios gracefully', async () => {
      // Arrange - Invalid client ID
      const invalidId = faker.string.uuid();

      // Act & Assert - Get non-existent client
      const nonExistentClient = await ClientService.getClientById(invalidId);
      expect(nonExistentClient).toBeNull();

      // Act & Assert - Update non-existent client
      const updateResult = await ClientService.updateClient(invalidId, { name: 'Test' });
      expect(updateResult).toBeNull();

      // Act & Assert - Delete non-existent client
      const deleteResult = await ClientService.deleteClient(invalidId);
      expect(deleteResult).toBe(false);

      // Act & Assert - Update integrations for non-existent client
      const integrationResult = await ClientService.updateIntegrations(invalidId, {
        facebookAds: { accessToken: 'test', adAccountId: 'test', connected: true },
      });
      expect(integrationResult).toBeNull();

      // Act & Assert - Test integrations for non-existent client
      await expect(ClientService.testIntegrations(invalidId)).rejects.toThrow(
        'Client not found'
      );
    });
  });
});
