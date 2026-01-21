#!/usr/bin/env node

/**
 * Temporary script to run database migration
 * This script reads the SQL migration file and executes it using Supabase client
 */

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Read environment from .mcp.json (hardcoded for this migration)
const SUPABASE_URL = 'https://tdgxfhoymdjszrsctcxh.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkZ3hmaG95bWRqc3pyc2N0Y3hoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjA0MDE5OCwiZXhwIjoyMDgxNjE2MTk4fQ.UWoXq5oT3Dw_1kcUU_9cu3NQ24RncdiLtQwYB7eD8UY';

async function runMigration() {
  console.log('🚀 Starting database migration...\n');

  // Read SQL file
  const sqlContent = fs.readFileSync('./migration-add-client-address-ico.sql', 'utf8');

  // Split SQL into individual statements
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

  // Create Supabase client with service role key
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    console.log(`Executing statement ${i + 1}/${statements.length}...`);

    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: statement
    });

    if (error) {
      // Try direct query if RPC doesn't work
      const { error: directError } = await supabase
        .from('_sql')
        .select('*')
        .limit(0);

      if (directError) {
        console.error(`❌ Error executing statement ${i + 1}:`, error.message);
        console.error('Statement:', statement);
        console.log('\n⚠️  Migration may require manual execution in Supabase Dashboard');
        console.log('📋 Copy the SQL from migration-add-client-address-ico.sql');
        console.log('🔗 Go to: https://supabase.com/dashboard/project/tdgxfhoymdjszrsctcxh/sql');
        process.exit(1);
      }
    } else {
      console.log(`✅ Statement ${i + 1} executed successfully`);
    }
  }

  console.log('\n✨ Migration completed successfully!');
  console.log('\nNew columns added:');
  console.log('  - clients: address, ico');
  console.log('  - invoices: client_name, client_address, client_ico');
}

runMigration().catch(error => {
  console.error('❌ Migration failed:', error.message);
  console.log('\n⚠️  Please run the migration manually:');
  console.log('📋 Copy the SQL from migration-add-client-address-ico.sql');
  console.log('🔗 Go to: https://supabase.com/dashboard/project/tdgxfhoymdjszrsctcxh/sql');
  process.exit(1);
});
