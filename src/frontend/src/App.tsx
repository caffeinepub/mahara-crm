import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import AppLayout from "./components/AppLayout";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import DashboardPage from "./pages/DashboardPage";
import FollowUpsPage from "./pages/FollowUpsPage";
import LeadDetailPage from "./pages/LeadDetailPage";
import LeadsPage from "./pages/LeadsPage";
import LoginPage from "./pages/LoginPage";
import PipelinePage from "./pages/PipelinePage";
import RegisterPage from "./pages/RegisterPage";
import SettingsPage from "./pages/SettingsPage";

const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <Toaster position="top-right" />
    </>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
  component: () => null,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: RegisterPage,
});

const protectedLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "protected",
  component: ProtectedLayout,
});

function ProtectedLayout() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal" />
      </div>
    );
  }
  if (!user) {
    throw redirect({ to: "/login" });
  }
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

const dashboardRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/dashboard",
  component: DashboardPage,
});

const leadsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/leads",
  component: LeadsPage,
});

const leadDetailRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/leads/$id",
  component: LeadDetailPage,
});

const pipelineRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/pipeline",
  component: PipelinePage,
});

const followUpsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/followups",
  component: FollowUpsPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/settings",
  component: SettingsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  protectedLayoutRoute.addChildren([
    dashboardRoute,
    leadsRoute,
    leadDetailRoute,
    pipelineRoute,
    followUpsRoute,
    settingsRoute,
  ]),
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
