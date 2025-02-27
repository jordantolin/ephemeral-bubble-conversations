
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend("re_BnXkLYnN_Ftf5ja1Q983MnzG4aR53Cc5b");

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
    const { email, username, verificationToken } = await req.json()
    const verificationUrl = `${Deno.env.get('SITE_URL')}/verify?token=${verificationToken}`

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
                <img src="https://your-app-url.com/lovable-uploads/1e765740-61ed-4cac-9a40-b57138f6da26.png" alt="Bubble Trouble Logo" class="logo">
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
