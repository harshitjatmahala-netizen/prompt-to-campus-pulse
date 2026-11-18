import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_shell/admin")({
  beforeLoad: ({ context }) => {
    if (context.me.role !== "admin") throw redirect({ to: "/dashboard" });
  },
  component: () => <Outlet />,
});
