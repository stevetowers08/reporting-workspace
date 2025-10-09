#!/usr/bin/env node

/**
 * Database Schema Check Script
 * This script checks what tables exist in Supabase
 */

import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://bdmcdyxjdkgitphieklb.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbWNkeXhqZGtnaXRwaGlla2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mzk3MDYsImV4cCI6MjA3NTAxNTcwNn0.QwmjIXs7PbTi21GGDNd1Z0EQR2R6B_fwYWCXDFeOCPw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDatabaseTables() {
  console.log('🔍 Checking database tables...');
  
  try {
    // Test connection first
    const { data: testData, error: testError } = await supabase
      .from('clients')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Database connection failed:', testError.message);
      return false;
    }
    
    console.log('✅ Database connection successful');
    
    // Check each table
    const tables = ['clients', 'integrations', 'oauth_credentials', 'metrics'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count')
          .limit(1);
        
        if (error) {
          console.log(`❌ Table '${table}' does not exist (${error.code})`);
        } else {
          console.log(`✅ Table '${table}' exists`);
        }
      } catch (err) {
        console.log(`❌ Table '${table}' check failed:`, err.message);
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
    return false;
  }
}

// Run the check
checkDatabaseTables().then(success => {
  process.exit(success ? 0 : 1);
});
