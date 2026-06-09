import {
  createFileRoute,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { VerticalNavV2 } from "@/components/v2/vertical-nav";

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
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <VerticalNavV2 />
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
