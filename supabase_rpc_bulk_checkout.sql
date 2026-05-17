-- Performance Optimization: Bulk Auto-Checkout RPC

CREATE OR REPLACE FUNCTION public.bulk_close_attendance_sessions(
  p_session_ids uuid[],
  p_close_time timestamptz
)
RETURNS int AS $$
DECLARE
  v_updated_count int;
BEGIN
  UPDATE public.attendance_sessions
  SET 
    check_out_at = p_close_time,
    is_auto_checkout = true
  WHERE id = ANY(p_session_ids);
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
