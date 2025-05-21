
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
    
    // Instead of using the standard Supabase email, we'll create a custom verification link
    // First, generate a secure random token
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Store this token in the database with an expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiration
    
    // Store the verification token in a custom table if it exists, otherwise use auth.users metadata
    try {
      // First try to update the user's metadata with the verification token
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        {
          user_metadata: {
            verification_token: token,
            verification_token_expires_at: expiresAt.toISOString(),
          }
        }
      );
      
      if (updateError) {
        console.error("Error updating user metadata:", updateError);
        throw updateError;
      }
    } catch (err) {
      console.error("Failed to store verification token:", err);
      throw new Error("Failed to generate verification link");
    }
    
    // Create a verification URL that points to our app
    const verificationUrl = `${siteUrl}/auth?custom_verification_token=${token}&user_id=${userId}`;
    
    console.log("Sending verification email to:", email);
    console.log("Custom verification URL:", verificationUrl);

    const emailResponse = await resend.emails.send({
      from: "Bubble Trouble <bubbletroubleapp@gmail.com>",
      to: [email],
      subject: "Welcome to Your 3D Bubble World - Verify Your Email",
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
                color: #333;
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
                width: 100px;
                height: 100px;
                border-radius: 50%;
                box-shadow: 0 4px 10px rgba(235, 189, 52, 0.3);
                padding: 10px;
                background: white;
              }
              .bubble-icon {
                display: inline-block;
                background: rgba(235, 189, 52, 0.2);
                border-radius: 50%;
                height: 20px;
                width: 20px;
                margin: 0 5px;
              }
              .content {
                background: white;
                padding: 30px;
                border-radius: 20px;
                box-shadow: 0 2px 20px rgba(0,0,0,0.05);
                position: relative;
                overflow: hidden;
              }
              .content::before {
                content: '';
                position: absolute;
                top: -80px;
                right: -80px;
                width: 160px;
                height: 160px;
                border-radius: 50%;
                background: rgba(235, 189, 52, 0.1);
                z-index: 0;
              }
              .content::after {
                content: '';
                position: absolute;
                bottom: -40px;
                left: -40px;
                width: 100px;
                height: 100px;
                border-radius: 50%;
                background: rgba(235, 189, 52, 0.1);
                z-index: 0;
              }
              .content > * {
                position: relative;
                z-index: 1;
              }
              .button {
                display: inline-block;
                background-color: #ebbd34;
                color: white;
                padding: 15px 30px;
                border-radius: 30px;
                text-decoration: none;
                margin: 20px 0;
                font-weight: bold;
                text-align: center;
                box-shadow: 0 4px 8px rgba(235, 189, 52, 0.3);
                transition: transform 0.2s;
              }
              .button:hover {
                transform: scale(1.02);
              }
              .footer {
                text-align: center;
                color: #666;
                font-size: 14px;
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid rgba(235, 189, 52, 0.2);
              }
              .fancy-title {
                color: #ebbd34;
                font-size: 28px;
                margin-bottom: 25px;
                text-shadow: 0 1px 2px rgba(0,0,0,0.1);
              }
              .bubble-animation {
                height: 60px;
                position: relative;
                margin: 30px 0;
              }
              .bubble-float {
                position: absolute;
                background-color: rgba(235, 189, 52, 0.2);
                border-radius: 50%;
                animation: float 6s infinite ease-in-out;
              }
              .bubble-1 {
                width: 30px;
                height: 30px;
                left: 20%;
                animation-delay: 0s;
              }
              .bubble-2 {
                width: 20px;
                height: 20px;
                left: 40%;
                animation-delay: 1s;
              }
              .bubble-3 {
                width: 35px;
                height: 35px;
                left: 60%;
                animation-delay: 2s;
              }
              .bubble-4 {
                width: 25px;
                height: 25px;
                left: 80%;
                animation-delay: 3s;
              }
              @keyframes float {
                0% { transform: translateY(0); opacity: 0; }
                20% { opacity: 0.8; }
                100% { transform: translateY(-60px); opacity: 0; }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <img src="https://fmsijphhzututcmzlhfr.supabase.co/storage/v1/object/public/bubble-assets/Bubbletroublefinallogo.png" alt="Bubble Trouble Logo" class="logo">
                <h1 class="fancy-title">Welcome to Bubble Trouble!</h1>
              </div>
              <div class="content">
                <p><span class="bubble-icon"></span> Hello ${username},</p>
                <p>Welcome to Bubble Trouble, where conversations float like bubbles in a 3D world!</p>
                <p>Your 3D bubble world is just one click away. To dive into conversations that matter, please verify your email:</p>
                
                <div class="bubble-animation">
                  <div class="bubble-float bubble-1"></div>
                  <div class="bubble-float bubble-2"></div>
                  <div class="bubble-float bubble-3"></div>
                  <div class="bubble-float bubble-4"></div>
                </div>
                
                <div style="text-align: center;">
                  <a href="${verificationUrl}" class="button">Verify & Enter Your Bubble World</a>
                </div>
                
                <p style="margin-top: 25px;">Once verified, you'll be able to:</p>
                <ul>
                  <li>Create your own conversation bubbles</li>
                  <li>Explore topics that resonate with you</li>
                  <li>Connect with like-minded individuals in a vibrant 3D space</li>
                </ul>
                
                <p style="font-size: 14px; color: #666; margin-top: 30px;">If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="font-size: 12px; color: #666; word-break: break-all; background: #f9f9f9; padding: 10px; border-radius: 6px;">${verificationUrl}</p>
                
                <p style="font-style: italic; color: #ebbd34; margin-top: 25px;">Your link will expire in 24 hours for security reasons.</p>
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

    console.log("Email response:", emailResponse);
    
    // Also disable the default Supabase email confirmation
    try {
      await supabase.auth.admin.updateUserById(
        userId,
        { email_confirm: true }
      );
    } catch (confirmError) {
      console.error("Failed to auto-confirm email:", confirmError);
      // Continue anyway
    }
    
    return new Response(
      JSON.stringify(emailResponse),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      },
    )
  } catch (error) {
    console.error("Error in send-verification-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      },
    )
  }
})
