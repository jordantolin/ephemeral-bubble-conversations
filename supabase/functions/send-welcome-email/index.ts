
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    
    // TODO: In a production environment, this would be where you'd integrate with
    // an email delivery service like SendGrid, Resend, etc. to send emails from
    // bubbletroubleapp@gmail.com instead of the default Supabase sender.
    //
    // Example:
    // const emailResponse = await sendGridClient.send({
    //   from: "bubbletroubleapp@gmail.com",
    //   to: email,
    //   subject: "Welcome to Bubble Trouble! Please Verify Your Email",
    //   html: emailTemplate(name || username, actionLink)
    // });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Verification email sent",
        details: "The actual email will be sent by Supabase's default email service. " +
                "To customize the sender email to bubbletroubleapp@gmail.com, " +
                "you would need to configure a custom SMTP server in Supabase or " +
                "use a third-party email service like SendGrid in this function."
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
