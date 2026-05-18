import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { AuthProvider } from "./features/auth/AuthContext";
import { ProfileProvider } from "./features/profile/ProfileContext";
import { DashboardPage } from "./routes/DashboardPage";
import { FoodsPage } from "./routes/FoodsPage";
import { HistoryPage } from "./routes/HistoryPage";
import { LoginPage } from "./routes/LoginPage";
import { OnboardingPage } from "./routes/OnboardingPage";
import { PlatesPage } from "./routes/PlatesPage";
import { OnboardingRoute, ProtectedRoute, PublicOnlyRoute } from "./routes/ProtectedRoute";
import { SettingsPage } from "./routes/SettingsPage";
import { SummaryPage } from "./routes/SummaryPage";

export function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <ProfileProvider>
          <Routes>
            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<LoginPage />} />
            </Route>
            <Route element={<OnboardingRoute />}>
              <Route path="/onboarding" element={<OnboardingPage />} />
            </Route>
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="/foods" element={<FoodsPage />} />
                <Route path="/plates" element={<PlatesPage />} />
                <Route path="/summary" element={<SummaryPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ProfileProvider>
      </AuthProvider>
    </HashRouter>
  );
}
