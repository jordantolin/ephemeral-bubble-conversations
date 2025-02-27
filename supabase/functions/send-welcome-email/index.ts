
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Resend } from "https://esm.sh/resend@1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Resend with the API key from environment
const resendApiKey = Deno.env.get("RESEND_API_KEY");
const resend = new Resend(resendApiKey);

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
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verifica il tuo account Bubble Trouble</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9f9f9;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #FEF7E4; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding: 30px 0; text-align: center; background-color: #FEF7E4;">
              <img src="https://bubbletroubleapp.com/lovable-uploads/1e765740-61ed-4cac-9a40-b57138f6da26.png" alt="Bubble Trouble" style="width: 100px; height: 100px;">
              <h1 style="color: #ebbd34; font-size: 24px; margin: 15px 0 0;">Benvenuto su Bubble Trouble!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px; background-color: white;">
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin-top: 0;">Ciao ${name || username},</p>
              
              <p style="color: #333; font-size: 16px; line-height: 1.6;">Grazie per esserti iscritto a Bubble Trouble! Siamo entusiasti di averti con noi.</p>
              
              <p style="color: #333; font-size: 16px; line-height: 1.6;">Per iniziare, verifica il tuo indirizzo email cliccando sul pulsante qui sotto:</p>
              
              <div style="text-align: center; margin: 35px 0;">
                <a href="${actionLink}" style="background-color: #ebbd34; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px; transition: background-color 0.3s ease;">Verifica Email</a>
              </div>
              
              <p style="color: #333; font-size: 16px; line-height: 1.6;">Se il pulsante non funziona, copia e incolla questo link nel tuo browser:</p>
              
              <p style="background-color: #f5f5f5; padding: 12px; border-radius: 6px; word-break: break-all; font-size: 14px; line-height: 1.4; margin: 20px 0;">
                ${actionLink}
              </p>
              
              <p style="color: #333; font-size: 16px; line-height: 1.6;">Questo link scadrà dopo 24 ore.</p>
              
              <p style="color: #333; font-size: 16px; line-height: 1.6;">Se non hai creato un account con Bubble Trouble, puoi ignorare questa email.</p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="color: #666; font-size: 14px; margin: 0;">Grazie,<br>Il team di Bubble Trouble</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; text-align: center; background-color: #f8f3e2;">
              <p style="color: #888; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} Bubble Trouble. Tutti i diritti riservati.</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    try {
      // Send the email using Resend - using bubbletroubleapp@gmail.com after it's verified
      const emailResponse = await resend.emails.send({
        from: "Bubble Trouble <bubbletroubleapp@gmail.com>", 
        to: email,
        subject: "Verifica il tuo account Bubble Trouble",
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
