
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Create a Supabase client with the service role key for admin privileges
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email, username, userId } = await req.json()
    const siteUrl = Deno.env.get('SITE_URL') || 'http://localhost:5173'
    
    // Generate a token for this user
    const { data: tokenData, error: tokenError } = await supabase.auth.admin.generateLink({
      type: 'signup',
      email: email,
      options: {
        redirectTo: `${siteUrl}/auth`
      }
    });

    if (tokenError) {
      throw new Error(`Error generating verification link: ${tokenError.message}`);
    }

    // Extract the token from the URL
    const fullUrl = tokenData.properties.action_link;
    const token = new URL(fullUrl).searchParams.get('token');
    
    if (!token) {
      throw new Error('Failed to extract verification token from generated link');
    }

    const verificationUrl = `${siteUrl}/auth?verification_token=${token}`;

    const emailResponse = await resend.emails.send({
      from: "Bubble Trouble <bubbletroubleapp@gmail.com>",
      to: [email],
      subject: "Welcome to Bubble Trouble - Verify Your Email",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Welcome to Bubble Trouble</title>
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                margin: 0;
                padding: 0;
                background-color: #FEF7E4;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                text-align: center;
                padding: 20px 0;
              }
              .logo {
                width: 80px;
                height: 80px;
              }
              .content {
                background: white;
                padding: 30px;
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.05);
              }
              .button {
                display: inline-block;
                background-color: #ebbd34;
                color: white;
                padding: 12px 24px;
                border-radius: 6px;
                text-decoration: none;
                margin: 20px 0;
              }
              .footer {
                text-align: center;
                color: #666;
                font-size: 14px;
                margin-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <img src="https://fmsijphhzututcmzlhfr.supabase.co/storage/v1/object/public/bubble-assets/bubble_logo.png" alt="Bubble Trouble Logo" class="logo">
                <h1 style="color: #ebbd34; margin-top: 15px;">Welcome to Bubble Trouble!</h1>
              </div>
              <div class="content">
                <p>Hi ${username},</p>
                <p>Welcome to Bubble Trouble! We're excited to have you join our community.</p>
                <p>To complete your registration and start exploring bubbles, please verify your email address by clicking the button below:</p>
                <div style="text-align: center;">
                  <a href="${verificationUrl}" class="button">Verify Email Address</a>
                </div>
                <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                <p style="font-size: 14px; color: #666;">${verificationUrl}</p>
                <p>This link will expire in 24 hours for security reasons.</p>
              </div>
              <div class="footer">
                <p>© 2024 Bubble Trouble. All rights reserved.</p>
                <p>If you didn't create an account on Bubble Trouble, please ignore this email.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    return new Response(
      JSON.stringify(emailResponse),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      },
    )
  }
})
