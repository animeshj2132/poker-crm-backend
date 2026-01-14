const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres.mvxqemhzciocszdjcmqs:new-poker-password@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres';

async function cleanOldChats() {
  const client = new Client({ 
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Delete all staff chat messages
    const messagesResult = await client.query(`
      DELETE FROM chat_messages
      WHERE session_id IN (
        SELECT id FROM chat_sessions WHERE session_type = 'staff'
      )
    `);
    console.log(`🗑️  Deleted ${messagesResult.rowCount} staff chat messages`);

    // Delete all staff chat sessions
    const sessionsResult = await client.query(`
      DELETE FROM chat_sessions WHERE session_type = 'staff'
    `);
    console.log(`🗑️  Deleted ${sessionsResult.rowCount} staff chat sessions`);

    console.log('\n✅ All old staff chats cleaned up!');
    console.log('👉 Now you can create fresh chats that will work properly.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

cleanOldChats();
