import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarDays, Home, LogOut, Salad, Settings, ShieldCheck, Utensils, UserRound } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { logout } from "../../lib/firebase";
import { useAuth } from "../../features/auth/AuthContext";
import { useProfile } from "../../features/profile/ProfileContext";
import { shouldAskWeightToday } from "../../utils/calculations";
import { WeightPromptModal } from "../forms/WeightPromptModal";
import { Button } from "../ui/Button";

const navItems = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/foods", label: "Besinler", icon: Salad },
  { to: "/plates", label: "Tabak", icon: Utensils },
  { to: "/summary", label: "Özet", icon: BarChart3 },
  { to: "/history", label: "Geçmiş", icon: CalendarDays },
  { to: "/settings", label: "Ayarlar", icon: Settings },
];

const adminNavItem = { to: "/admin", label: "Admin", icon: ShieldCheck };

export function AppLayout() {
  const { user, isAdmin } = useAuth();
  const { profile } = useProfile();
  const [photoIndex, setPhotoIndex] = useState(0);
  const visibleNavItems = useMemo(() => (isAdmin ? [...navItems, adminNavItem] : navItems), [isAdmin]);
  const profilePhotoURLs = useMemo(
    () =>
      Array.from(
        new Set(
          [profile?.photoURL, user?.photoURL, ...(user?.providerData.map((provider) => provider.photoURL) ?? [])]
            .filter((url): url is string => Boolean(url))
            .flatMap(getPhotoURLVariants),
        ),
      ),
    [profile?.photoURL, user?.photoURL, user?.providerData],
  );
  const profilePhotoURL = profilePhotoURLs[photoIndex];

  useEffect(() => {
    setPhotoIndex(0);
  }, [profilePhotoURLs]);

  return (
    <div className="min-h-screen bg-cloud">
      <aside className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-white md:inset-x-auto md:bottom-auto md:left-0 md:top-0 md:h-screen md:w-64 md:border-r md:border-t-0">
        <div className="hidden p-5 md:block">
          <p className="text-xl font-black text-ink">Kalori Takip</p>
          <p className="mt-1 text-xs text-ink/55">Kişisel takip aracın</p>
        </div>
        <nav className={`grid gap-1 p-2 md:grid-cols-1 md:px-3 ${isAdmin ? "grid-cols-4 sm:grid-cols-7" : "grid-cols-6"}`}>
          {visibleNavItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex min-h-12 flex-col items-center justify-center gap-1 rounded-md px-2 text-xs font-semibold transition md:flex-row md:justify-start md:px-3 md:text-sm ${
                  isActive ? "bg-mint text-leaf" : "text-ink/65 hover:bg-ink/5 hover:text-ink"
                }`
              }
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="pb-24 md:ml-64 md:pb-0">
        <header className="sticky top-0 z-30 border-b border-ink/10 bg-cloud/90 px-4 py-3 backdrop-blur md:px-8">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-leaf">Calorie Tracker</p>
              <h1 className="truncate text-lg font-bold text-ink">{profile?.fullName || "Kalori Takip"}</h1>
            </div>
            <div className="flex items-center gap-2">
              {profilePhotoURL ? (
                <img
                  key={profilePhotoURL}
                  src={profilePhotoURL}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-9 w-9 rounded-full object-cover"
                  onError={() => setPhotoIndex((current) => current + 1)}
                />
              ) : (
                <UserRound className="h-8 w-8 text-ink/60" />
              )}
              <Button variant="ghost" icon={<LogOut className="h-4 w-4" />} onClick={() => logout()} className="px-3">
                <span className="hidden sm:inline">Çıkış</span>
              </Button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-5 md:px-8">
          <Outlet />
        </main>
      </div>
      {profile && profile.onboardingCompleted && shouldAskWeightToday(profile) ? <WeightPromptModal profile={profile} /> : null}
    </div>
  );
}

function getPhotoURLVariants(url: string) {
  if (!url.includes("googleusercontent.com")) return [url];

  const sizePattern = /=s\d+(?:-c)?$/;
  if (!sizePattern.test(url)) return [url];

  return [url, url.replace(sizePattern, "=s64-c"), url.replace(sizePattern, "=s128-c")];
}
