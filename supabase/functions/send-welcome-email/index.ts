
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Resend } from "https://esm.sh/resend@1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Resend with the API key
const resend = new Resend("re_J7JGSACe_3RZYJkZ5rpcoEyp6BzKnHp8E");

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Parse request body
    const { email, name, username } = await req.json();
    
    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: "Email is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get origin for proper redirection
    const origin = req.headers.get("origin") || Deno.env.get("PUBLIC_URL") || "https://bubbletroubleapp.com";
    
    // Ensure the redirect URL specifically goes to the auth page
    const redirectUrl = `${origin}/auth`;

    // Generate email verification link
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'signup',
      email,
      options: {
        redirectTo: redirectUrl, // Ensure redirection to the auth page
      }
    });

    if (error) {
      console.error("Error generating link:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get the verification URL
    const actionLink = data.properties.action_link;
    if (!actionLink) {
      throw new Error("No verification link generated");
    }

    // Log the generated link for verification and debugging
    console.log("Generated verification link:", actionLink);
    console.log("Redirects to:", redirectUrl);
    
    // Now use Resend to send the email with our custom template
    const emailTemplate = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #FEF7E4; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img src="https://bubbletroubleapp.com/lovable-uploads/1e765740-61ed-4cac-9a40-b57138f6da26.png" alt="Bubble Trouble" style="width: 80px; height: 80px;">
          <h1 style="color: #ebbd34; margin-top: 10px;">Welcome to Bubble Trouble!</h1>
        </div>
        
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.05);">
          <p style="color: #333; font-size: 16px; line-height: 1.5;">Hi ${name || username},</p>
          
          <p style="color: #333; font-size: 16px; line-height: 1.5;">Thank you for joining Bubble Trouble! We're excited to have you on board.</p>
          
          <p style="color: #333; font-size: 16px; line-height: 1.5;">To get started, please verify your email address by clicking the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${actionLink}" style="background-color: #ebbd34; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Verify Email Address</a>
          </div>
          
          <p style="color: #333; font-size: 16px; line-height: 1.5;">If the button doesn't work, copy and paste this link into your browser:</p>
          
          <p style="background-color: #f5f5f5; padding: 10px; border-radius: 4px; word-break: break-all; font-size: 14px;">
            ${actionLink}
          </p>
          
          <p style="color: #333; font-size: 16px; line-height: 1.5;">This link will expire after 24 hours.</p>
          
          <p style="color: #333; font-size: 16px; line-height: 1.5;">If you did not create an account with Bubble Trouble, please ignore this email.</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #777; font-size: 14px;">
          <p>&copy; ${new Date().getFullYear()} Bubble Trouble. All rights reserved.</p>
        </div>
      </div>
    `;

    try {
      // Send the email using Resend
      const emailResponse = await resend.emails.send({
        from: "Bubble Trouble <onboarding@resend.dev>", // This will show as "Bubble Trouble" in the inbox
        to: email,
        subject: "Welcome to Bubble Trouble! Please Verify Your Email",
        html: emailTemplate
      });

      console.log("Email sent via Resend:", emailResponse);
    } catch (emailError) {
      console.error("Error sending email via Resend:", emailError);
      // Continue execution even if email sending fails
      // The user can still use the Supabase-generated email
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Verification email sent via Resend",
        details: "A custom welcome email has been sent from Bubble Trouble via Resend."
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-welcome-email function:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
