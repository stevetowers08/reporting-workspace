// Test script to get venues from the API
import { DatabaseService } from './src/services/data/databaseService.js';

async function getVenues() {
  try {
    console.log('🔍 Fetching venues (clients) from database...');
    const venues = await DatabaseService.getAllClients();
    console.log('✅ Successfully retrieved venues:');
    console.log(JSON.stringify(venues, null, 2));
  } catch (error) {
    console.error('❌ Error fetching venues:', error.message);
    console.error('Stack:', error.stack);
  }
}

getVenues();
