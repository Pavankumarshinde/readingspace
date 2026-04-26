import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';


export async function POST(req: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY!)
  try {
    const supabase = await createClient();
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // 1. Store the query in Supabase proper backend
    const { error: dbError } = await supabase
      .from('support_queries')
      .insert([
        {
          user_id: user.id,
          email: user.email,
          message: message
        }
      ]);

    if (dbError) {
      console.error('Supabase Error:', dbError);
      return NextResponse.json({ error: 'Failed to record query in database.' }, { status: 500 });
    }

    // 2. Try to send the email using Resend
    try {
      const { data, error } = await resend.emails.send({
        // MUST use onboarding@resend.dev on free tier without a verified domain
        from: 'ReadingSpace Support <onboarding@resend.dev>', 
        
        // MUST send exactly to the email address that registered the resend account
        to: ['pavankumarshinde08@gmail.com'], 
        
        subject: `New Student Query from ${user.email}`,
        text: `You have received a new query from ${user.email}:\n\n${message}`,
      });

      if (error) {
        console.warn('Resend failed:', error);
      }
    } catch (emailErr) {
      console.warn('Resend exception:', emailErr);
    }

    // Always return success if DB insertion worked
    return NextResponse.json({ success: true, message: 'Query stored in DB and email dispatched.' });
  } catch (err: any) {
    console.error('Server error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
