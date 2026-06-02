import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { useProfile } from "../features/profile/ProfileContext";
import { LoadingScreen } from "../components/ui/LoadingScreen";

function ProfileLoadError({ message }: { message: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-cloud px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 text-center shadow-soft">
        <h1 className="text-lg font-bold text-ink">Veriler yüklenemedi</h1>
        <p className="mt-2 text-sm text-ink/65">{message}</p>
        <button
          className="mt-4 rounded-md bg-leaf px-4 py-2 text-sm font-bold text-white"
          type="button"
          onClick={() => window.location.reload()}
        >
          Yeniden dene
        </button>
      </div>
    </div>
  );
}

export function ProtectedRoute() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, error: profileError } = useProfile();
  const location = useLocation();

  if (authLoading || profileLoading) return <LoadingScreen />;
  if (profileError) return <ProfileLoadError message={profileError} />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!profile?.onboardingCompleted) return <Navigate to="/onboarding" replace />;

  return <Outlet />;
}

export function OnboardingRoute() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, error: profileError } = useProfile();

  if (authLoading || profileLoading) return <LoadingScreen />;
  if (profileError) return <ProfileLoadError message={profileError} />;
  if (!user) return <Navigate to="/login" replace />;
  if (profile?.onboardingCompleted) return <Navigate to="/" replace />;

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, error: profileError } = useProfile();

  if (authLoading || profileLoading) return <LoadingScreen />;
  if (profileError) return <ProfileLoadError message={profileError} />;
  if (user && profile?.onboardingCompleted) return <Navigate to="/" replace />;
  if (user && !profile?.onboardingCompleted) return <Navigate to="/onboarding" replace />;

  return <Outlet />;
}
