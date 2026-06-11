import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarDays, Home, LogOut, Menu, Salad, Settings, ShieldCheck, Utensils, UserRound, X } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
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
  const location = useLocation();
  const [photoIndex, setPhotoIndex] = useState(0);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isMobileNavCompact, setIsMobileNavCompact] = useState(false);
  const visibleNavItems = useMemo(() => (isAdmin ? [...navItems, adminNavItem] : navItems), [isAdmin]);
  const mobilePrimaryNavItems = useMemo(
    () => visibleNavItems.filter(({ to }) => ["/", "/foods", "/summary", "/history"].includes(to)),
    [visibleNavItems],
  );
  const mobileMoreNavItems = useMemo(
    () => visibleNavItems.filter(({ to }) => !mobilePrimaryNavItems.some((item) => item.to === to)),
    [mobilePrimaryNavItems, visibleNavItems],
  );
  const isMoreRouteActive = mobileMoreNavItems.some(({ to }) => location.pathname === to);
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

  useEffect(() => {
    setIsMoreMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (isMoreMenuOpen) {
      setIsMobileNavCompact(false);
      return;
    }

    let lastScrollY = window.scrollY;
    let ticking = false;

    function updateNavSize() {
      const currentScrollY = window.scrollY;
      const isMobile = window.matchMedia("(max-width: 767px)").matches;
      const delta = currentScrollY - lastScrollY;

      if (!isMobile || currentScrollY < 80 || delta < -8) {
        setIsMobileNavCompact(false);
      } else if (delta > 8) {
        setIsMobileNavCompact(true);
      }

      lastScrollY = currentScrollY;
      ticking = false;
    }

    function handleScroll() {
      if (ticking) return;
      window.requestAnimationFrame(updateNavSize);
      ticking = true;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [isMoreMenuOpen]);

  return (
    <div className="desktop-liquid-shell min-h-screen bg-cloud">
      <aside
        className={`mobile-nav-shell liquid-glass-nav desktop-sidebar fixed inset-x-3 bottom-[calc(0.45rem+env(safe-area-inset-bottom))] z-40 rounded-[1.45rem] border border-white/55 bg-white/45 transition-all duration-300 ease-out md:inset-x-auto md:bottom-auto md:left-0 md:top-0 md:h-screen md:w-64 md:rounded-none md:border-0 md:border-r md:border-ink/10 md:bg-white ${
          isMobileNavCompact ? "liquid-glass-nav-compact" : "liquid-glass-nav-expanded"
        }`}
      >
        <div className="hidden p-5 md:block">
          <div className="flex items-center gap-3">
            <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className="h-11 w-11 shrink-0 rounded-xl shadow-soft" />
            <div className="min-w-0">
              <p className="text-xl font-black leading-tight text-ink">Kalori Takip</p>
              <p className="mt-1 text-xs text-ink/55">Kişisel takip aracın</p>
            </div>
          </div>
        </div>
        <div
          className={`mobile-menu-sheet liquid-glass-menu absolute inset-x-0 bottom-[calc(100%+0.75rem)] rounded-[1.5rem] border border-white/65 bg-white/70 p-2 shadow-xl shadow-ink/15 transition-all duration-300 ease-out md:hidden ${
            isMoreMenuOpen
              ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
              : "pointer-events-none translate-y-3 scale-95 opacity-0"
          }`}
        >
          <nav className="grid gap-1" aria-label="Ek mobil navigasyon">
            {mobileMoreNavItems.map(({ to, label, icon: Icon }, index) => (
              <NavLink
                key={to}
                to={to}
                style={{ transitionDelay: isMoreMenuOpen ? `${index * 35}ms` : "0ms" }}
                className={({ isActive }) =>
                  `mobile-nav-item liquid-glass-menu-item flex min-h-11 items-center gap-3 rounded-[1.15rem] px-3 text-sm font-semibold transition-all duration-200 ${
                    isMoreMenuOpen ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                  } ${isActive ? "liquid-glass-active text-leaf" : "text-ink/70 hover:bg-white/45 hover:text-ink"}`
                }
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
        <nav className="mobile-main-nav grid grid-cols-5 gap-0.5 p-1 transition-all duration-300 md:hidden" aria-label="Mobil ana navigasyon">
          {mobilePrimaryNavItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `mobile-nav-item mobile-main-nav-item flex min-h-[2.65rem] flex-col items-center justify-center gap-px rounded-[0.95rem] px-1 text-[10px] font-semibold transition ${
                  isActive ? "liquid-glass-active text-leaf" : "text-ink/65 hover:bg-white/35 hover:text-ink"
                }`
              }
            >
              <Icon className="h-5 w-5" />
              <span className="mobile-nav-label">{label}</span>
            </NavLink>
          ))}
          <button
            type="button"
            aria-expanded={isMoreMenuOpen}
            aria-label="Diğer sayfaları aç"
            onClick={() => setIsMoreMenuOpen((isOpen) => !isOpen)}
            className={`mobile-nav-item mobile-main-nav-item flex min-h-[2.65rem] flex-col items-center justify-center gap-px rounded-[0.95rem] px-1 text-[10px] font-semibold transition ${
              isMoreMenuOpen || isMoreRouteActive ? "liquid-glass-active text-leaf" : "text-ink/65 hover:bg-white/35 hover:text-ink"
            }`}
          >
            <span className={`transition-transform duration-200 ${isMoreMenuOpen ? "rotate-90 scale-110" : "rotate-0 scale-100"}`}>
              {isMoreMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </span>
            <span className="mobile-nav-label">Menü</span>
          </button>
        </nav>
        <nav className="hidden gap-1 p-2 md:grid md:grid-cols-1 md:px-3" aria-label="Ana navigasyon">
          {visibleNavItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `desktop-nav-item flex min-h-12 flex-col items-center justify-center gap-1 rounded-md px-2 text-xs font-semibold transition md:flex-row md:justify-start md:px-3 md:text-sm ${
                  isActive ? "desktop-nav-active bg-mint text-leaf" : "text-ink/65 hover:bg-ink/5 hover:text-ink"
                }`
              }
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="relative pb-24 md:ml-64 md:pb-0">
        <header className="liquid-glass-topbar mobile-topbar desktop-topbar sticky top-0 z-30 border-b border-ink/10 bg-cloud/90 px-4 py-3 backdrop-blur md:px-8">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className="h-10 w-10 shrink-0 rounded-xl shadow-soft" />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-leaf">Calorie Tracker</p>
                <h1 className="truncate text-lg font-bold text-ink">{profile?.fullName || "Kalori Takip"}</h1>
              </div>
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
        <main className="mobile-screen desktop-content mx-auto max-w-6xl px-4 py-5 md:px-8">
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
