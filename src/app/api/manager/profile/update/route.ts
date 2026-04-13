import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updates = await req.json();

    // Whitelist MANAGER fields securely
    const allowedFields = ['name', 'business_name', 'address', 'phone'];
    const safePayload: any = {};
    
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        safePayload[key] = updates[key];
      }
    }

    if (Object.keys(safePayload).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided for update' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(safePayload)
      .eq('id', user.id);

    if (updateError) {
      console.error('Profile Update Error:', updateError);
      return NextResponse.json({ error: 'Failed to update profile data' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Profile safely updated' });

  } catch (err: any) {
    console.error('Server error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
