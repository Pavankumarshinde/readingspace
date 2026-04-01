-- Migration: Add Geofencing fields to rooms table
ALTER TABLE public.rooms 
ADD COLUMN latitude float8,
ADD COLUMN longitude float8,
ADD COLUMN radius float8 DEFAULT 200.0;

-- Optional: Update RLS policies if necessary (it shouldn't be as it's already using select/update)
