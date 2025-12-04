-- 1. Ensure the table exists
CREATE TABLE IF NOT EXISTS beneficiaries (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add columns if they are missing (Safe for existing tables)
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS aadhaar TEXT;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS asset_name TEXT;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS asset_value NUMERIC;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS sanction_amount NUMERIC;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS village TEXT;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS mobile TEXT;
ALTER TABLE beneficiaries ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 3. Insert or Update the records
INSERT INTO beneficiaries (id, full_name, aadhaar, address, asset_name, asset_value, bank_name, sanction_amount, village, mobile, metadata)
VALUES 
    ('7327007170', 'Deepankar Sahoo', '988837423899', 'Jajpur', 'Tractor', 298605, 'UCO', 2500080, 'Kalindrabad', '7327007170', '{"status": "Active", "createdAt": "2023-10-26T10:00:00Z", "beneficiaryUid": "BEN-001"}'::jsonb),
    ('9861510432', 'Swastik Kumar Purohit', '988834256912', 'Kalahandi', 'DG', 208647, 'Panjab', 308568, 'Danish Nagar', '9861510432', '{"status": "Active", "createdAt": "2023-10-27T10:00:00Z", "beneficiaryUid": "BEN-002"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    aadhaar = EXCLUDED.aadhaar,
    address = EXCLUDED.address,
    asset_name = EXCLUDED.asset_name,
    asset_value = EXCLUDED.asset_value,
    bank_name = EXCLUDED.bank_name,
    sanction_amount = EXCLUDED.sanction_amount,
    village = EXCLUDED.village,
    mobile = EXCLUDED.mobile,
    metadata = EXCLUDED.metadata,
    updated_at = NOW();
