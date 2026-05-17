-- ==========================================
-- PHASE 3: Data Integrity & Database Risks
-- Execute this script in the Supabase SQL Editor
-- ==========================================

-- 1. SOFT DELETES (Add deleted_at columns)
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.installments ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- 2. INDEXES (For high-frequency queries)
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_lookup ON public.attendance_sessions(student_id, room_id, date, check_out_at);
CREATE INDEX IF NOT EXISTS idx_installments_status ON public.installments(student_id, room_id, status, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON public.subscriptions(room_id, status);

-- 3. DROP RESTRICTIVE UNIQUE CONSTRAINT ON attendance_logs
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT tc.constraint_name INTO constraint_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'UNIQUE'
      AND tc.table_name = 'attendance_logs'
    GROUP BY tc.constraint_name
    HAVING count(*) = 3; 

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.attendance_logs DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

-- 4. ATOMIC STUDENT ENROLLMENT RPC
-- Wraps profiles, subscriptions, and installments into a single atomic transaction.
CREATE OR REPLACE FUNCTION public.enroll_student_transaction(
    p_student_id UUID,
    p_name TEXT,
    p_phone TEXT,
    p_email TEXT,
    p_room_id UUID,
    p_seat_number TEXT,
    p_start_date DATE,
    p_end_date DATE,
    p_payment_status TEXT
) RETURNS JSON AS $$
DECLARE
    v_sub_id UUID;
BEGIN
    -- 1. Upsert Profile
    INSERT INTO public.profiles (id, name, phone, email, membership_type)
    VALUES (p_student_id, p_name, p_phone, p_email, 'managed')
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        membership_type = EXCLUDED.membership_type;

    -- 2. Insert Subscription
    INSERT INTO public.subscriptions (student_id, room_id, seat_number, tier, membership_type, invite_sent, start_date, end_date)
    VALUES (p_student_id, p_room_id, p_seat_number, 'standard', 'managed', false, p_start_date, p_end_date)
    RETURNING id INTO v_sub_id;

    -- 3. Insert Installment
    INSERT INTO public.installments (student_id, room_id, subscription_id, start_date, end_date, status, payment_date)
    VALUES (p_student_id, p_room_id, v_sub_id, p_start_date, p_end_date, p_payment_status, CASE WHEN p_payment_status = 'paid' THEN now() ELSE null END);

    RETURN json_build_object('success', true, 'subscription_id', v_sub_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
