import {
  createFileRoute,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppNavV2 } from "@/components/v2/app-nav";

export const Route = createFileRoute("/_authenticated-v2")({
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
  component: AuthedV2Layout,
});

function AuthedV2Layout() {
  return (
    <div className="theme-v2 flex min-h-screen w-full flex-col bg-background">
      <AppNavV2 />
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}
