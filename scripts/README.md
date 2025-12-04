# Firebase to Supabase Migration Script

This script helps you migrate data from a Firebase Firestore database to a Supabase Postgres database.

## Prerequisites

1.  **Node.js** installed.
2.  **Firebase Service Account Key**:
    *   Go to Firebase Console > Project Settings > Service Accounts.
    *   Click "Generate new private key".
    *   Save the JSON file as `serviceAccountKey.json` in the `backend/scripts` folder (or update the path in the script).
3.  **Supabase Credentials**:
    *   You need your Supabase Project URL and **Service Role Key** (not the Anon key).
    *   These should be in your `.env` file in the `backend` folder.

## Setup

1.  Navigate to the `backend` folder:
    ```bash
    cd backend
    ```
2.  Install dependencies (if not already done):
    ```bash
    npm install
    ```
3.  Create or update your `.env` file in `backend/` with:
    ```env
    SUPABASE_URL=your_supabase_project_url
    SUPABASE_SERVICE_KEY=your_supabase_service_role_key
    FIREBASE_SERVICE_ACCOUNT_PATH=./scripts/serviceAccountKey.json
    ```

## Usage

1.  Open `backend/scripts/migrate-firebase-to-supabase.js`.
2.  Scroll down to the `runMigrations` function.
3.  Uncomment the `migrateCollection` calls or add your own.
4.  Map the fields from your Firestore documents to your Supabase table columns in the `transformFn`.
5.  Run the script:
    ```bash
    node scripts/migrate-firebase-to-supabase.js
    ```

## Notes

*   **Data Types**: Ensure the data types returned by your transform function match your Supabase table schema. Firestore Timestamps need to be converted to JS Dates or ISO strings.
*   **Relations**: If you have relational data, migrate the parent tables first (e.g., Users) before child tables (e.g., Posts).
*   **Storage**: This script only migrates database records. File migration requires a different approach (downloading and re-uploading).
