-- Sync existing affiliate staff to affiliates table
-- Migration: 0027_sync_existing_affiliates

-- This migration creates affiliate entries for any staff members with role 'Affiliate'
-- who don't already have an entry in the affiliates table

DO $$
DECLARE
    staff_record RECORD;
    user_id_var UUID;
    existing_user RECORD;
BEGIN
    -- Loop through all staff with role 'Affiliate'
    FOR staff_record IN 
        SELECT s.id, s.name, s.email, s.club_id, s.affiliate_code, s.created_at
        FROM staff s
        WHERE s.role = 'Affiliate'
        AND s.email IS NOT NULL
        AND s.affiliate_code IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM affiliates a 
            WHERE a.code = s.affiliate_code
        )
    LOOP
        -- Check if user exists with this email in users_v1 table
        SELECT id INTO existing_user
        FROM users_v1
        WHERE email = staff_record.email
        LIMIT 1;

        IF existing_user.id IS NOT NULL THEN
            user_id_var := existing_user.id;
        ELSE
            -- Create a new user for this affiliate
            INSERT INTO users_v1 (id, email, password_hash, display_name, created_at, updated_at)
            VALUES (
                uuid_generate_v4(),
                staff_record.email,
                '$2b$10$dummyHashForMigration', -- Dummy hash, they'll reset password
                staff_record.name,
                staff_record.created_at,
                NOW()
            )
            RETURNING id INTO user_id_var;
        END IF;

        -- Create affiliate entry
        INSERT INTO affiliates (
            id,
            club_id,
            user_id,
            code,
            name,
            commission_rate,
            status,
            total_commission,
            total_referrals,
            created_at,
            updated_at
        )
        VALUES (
            uuid_generate_v4(),
            staff_record.club_id,
            user_id_var,
            staff_record.affiliate_code,
            staff_record.name,
            5.0, -- Default 5% commission
            'Active',
            0,
            0,
            staff_record.created_at,
            NOW()
        )
        ON CONFLICT (code) DO NOTHING; -- Skip if code already exists

        RAISE NOTICE 'Created affiliate entry for staff: % (code: %)', staff_record.name, staff_record.affiliate_code;
    END LOOP;
END $$;

-- Success message
SELECT '✅ Existing affiliate staff synced to affiliates table!' as message;

