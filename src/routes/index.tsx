import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    // On the server we have no Supabase session (it lives in localStorage),
    // so always send the visitor to /login. The login page itself will
    // forward signed-in users to /v2/projects via onAuthStateChange.
    if (typeof window === "undefined") {
      throw redirect({ to: "/login" });
    }
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      throw redirect({ to: "/v2/projects" });
    }
    throw redirect({ to: "/login" });
  },
  component: () => null,
});
