import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { useProfile } from "../features/profile/ProfileContext";
import { LoadingScreen } from "../components/ui/LoadingScreen";

export function ProtectedRoute() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const location = useLocation();

  if (authLoading || profileLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!profile?.onboardingCompleted) return <Navigate to="/onboarding" replace />;

  return <Outlet />;
}

export function OnboardingRoute() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  if (authLoading || profileLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (profile?.onboardingCompleted) return <Navigate to="/" replace />;

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  if (authLoading || profileLoading) return <LoadingScreen />;
  if (user && profile?.onboardingCompleted) return <Navigate to="/" replace />;
  if (user && !profile?.onboardingCompleted) return <Navigate to="/onboarding" replace />;

  return <Outlet />;
}
