import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const email = "mullaneaa@gmail.com";
    const password = "BHA-Admin-2026!";

    // Check if user already exists
    const { data: existingUsers } =
      await supabaseAdmin.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u) => u.email === email);

    let userId: string;

    if (existing) {
      userId = existing.id;
      // Update password
      await supabaseAdmin.auth.admin.updateUserById(userId, { password });
    } else {
      const { data: newUser, error } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: "Super Admin" },
        });

      if (error) throw error;
      userId = newUser.user.id;
    }

    // Ensure profile exists with full_name
    await supabaseAdmin
      .from("profiles")
      .upsert(
        { user_id: userId, email, full_name: "Super Admin" },
        { onConflict: "user_id" }
      );

    // Remove any existing roles and set super_admin
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "super_admin" });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Super admin created: ${email} / ${password}`,
        user_id: userId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
