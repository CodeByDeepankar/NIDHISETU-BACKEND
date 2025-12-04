require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

// --- Configuration ---

// Supabase Credentials
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env');
  process.exit(1);
}

// Firebase Credentials (Client SDK)
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('Error: Firebase configuration keys (FIREBASE_API_KEY, etc.) must be set in .env');
  process.exit(1);
}

// --- Initialization ---

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// --- Migration Logic ---

/**
 * Migrates a Firestore collection to a Supabase table.
 * @param {string} collectionName - The name of the Firestore collection.
 * @param {string} tableName - The name of the Supabase table.
 * @param {function} transformFn - Optional function to transform data before insertion.
 */
async function migrateCollection(collectionName, tableName, transformFn = (data) => data) {
  console.log(`Starting migration: ${collectionName} -> ${tableName}`);
  
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    
    if (querySnapshot.empty) {
      console.log(`No documents found in collection: ${collectionName}`);
      return;
    }

    let count = 0;
    const batchSize = 100;
    let batch = [];

    for (const doc of querySnapshot.docs) {
      const data = doc.data();
      // Add the Firestore ID to the data
      const record = {
        id: doc.id, 
        ...data
      };

      const transformedRecord = transformFn(record);
      
      if (transformedRecord) {
        batch.push(transformedRecord);
      }

      if (batch.length >= batchSize) {
        const { error } = await supabase.from(tableName).upsert(batch);
        if (error) {
          console.error(`Error inserting batch into ${tableName}:`, error);
        } else {
          count += batch.length;
          console.log(`Migrated ${count} records...`);
        }
        batch = [];
      }
    }

    if (batch.length > 0) {
      const { error } = await supabase.from(tableName).upsert(batch);
      if (error) {
        console.error(`Error inserting final batch into ${tableName}:`, error);
      } else {
        count += batch.length;
      }
    }

    console.log(`Completed migration for ${collectionName}. Total records: ${count}`);

  } catch (error) {
    console.error(`Error migrating ${collectionName}:`, error);
  }
}

// --- Define Migrations Here ---

async function runMigrations() {
  
  // Example: Users
  // await migrateCollection('users', 'users', (user) => ({
  //   id: user.id,
  //   email: user.email,
  //   full_name: user.displayName,
  //   // Handle timestamps if needed
  //   created_at: user.createdAt ? new Date(user.createdAt.seconds * 1000) : new Date(),
  // }));

  console.log('Please uncomment and configure the migrateCollection calls in runMigrations()');
}

runMigrations()
  .then(() => {
    console.log('All migrations finished.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
