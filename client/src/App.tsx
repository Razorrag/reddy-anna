import { Switch, Route } from "wouter";
import Index from "@/pages/index.tsx";
import PlayerGame from "@/pages/player-game.tsx";
import Admin from "@/pages/admin.tsx";
import AdminGame from "@/pages/admin-game.tsx";
import UserAdmin from "@/pages/user-admin.tsx";
import AdminAnalytics from "@/pages/admin-analytics.tsx";
import AdminPayments from "@/pages/admin-payments.tsx";
import AdminBonus from "@/pages/admin-bonus.tsx";
import AdminBets from "@/pages/admin-bets.tsx";
import BackendSettings from "@/pages/backend-settings.tsx";
import AdminWhatsAppSettings from "@/pages/admin-whatsapp-settings.tsx";
import AdminStreamSettings from "@/pages/admin-stream-settings.tsx";
import GameHistoryPage from "@/pages/GameHistoryPage.tsx";
import AdminPartners from "@/pages/admin-partners.tsx";
import AdminPartnerDetail from "@/pages/admin-partner-detail.tsx";
import AdminPartnerWithdrawals from "@/pages/admin-partner-withdrawals.tsx";

import Login from "@/pages/login.tsx";
import Signup from "@/pages/signup.tsx";
import AdminLogin from "@/pages/admin-login.tsx";
import Profile from "@/pages/profile.tsx";
import NotFound from "@/pages/not-found.tsx";
import Unauthorized from "@/pages/unauthorized.tsx";
import ProtectedRoute from "@/components/ProtectedRoute.tsx";
import ProtectedAdminRoute from "@/components/ProtectedAdminRoute.tsx";
import ProtectedPartnerRoute from "@/components/ProtectedPartnerRoute.tsx";
import ErrorBoundary from "@/components/ErrorBoundary.tsx";
import AppProviders from "@/providers/AppProviders.tsx";

// 🤝 Partner Pages
import PartnerLogin from "@/pages/partner/partner-login.tsx";
import PartnerSignup from "@/pages/partner/partner-signup.tsx";
import PartnerGameHistory from "@/pages/partner/partner-game-history.tsx";
import PartnerProfile from "@/pages/partner/partner-profile.tsx";

// 📱 Import mobile performance optimizations
import "@/styles/mobile-optimizations.css";

function Router() {
  return (
    <Switch>
      {/* Homepage - Default route */}
      <Route path="/" component={Index} />

      {/* Public routes */}
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/admin-login" component={AdminLogin} />

      {/* Player Game Routes - Require authentication */}
      {/* Canonical game route */}
      <Route path="/game">
        <ProtectedRoute>
          <PlayerGame />
        </ProtectedRoute>
      </Route>
      {/* Legacy aliases redirect to /game */}
      <Route path="/play">{() => { window.history.replaceState(null, '', '/game'); return null; }}</Route>
      <Route path="/player-game">{() => { window.history.replaceState(null, '', '/game'); return null; }}</Route>

      {/* Profile Routes - Protected */}
      <Route path="/profile">
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      </Route>

      {/* Admin Routes - Protected */}
      <Route path="/admin">
        <ProtectedAdminRoute>
          <Admin />
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/game">
        <ProtectedAdminRoute>
          <AdminGame />
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/users">
        <ProtectedAdminRoute>
          <UserAdmin />
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/analytics">
        <ProtectedAdminRoute>
          <AdminAnalytics />
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/payments">
        <ProtectedAdminRoute>
          <AdminPayments />
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/bonus">
        <ProtectedAdminRoute>
          <AdminBonus />
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/bets">
        <ProtectedAdminRoute>
          <AdminBets />
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/backend-settings">
        <ProtectedAdminRoute>
          <BackendSettings />
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/whatsapp-settings">
        <ProtectedAdminRoute>
          <AdminWhatsAppSettings />
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/stream-settings">
        <ProtectedAdminRoute>
          <AdminStreamSettings />
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/game-history">
        <ProtectedAdminRoute>
          <GameHistoryPage />
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/partners">
        <ProtectedAdminRoute>
          <AdminPartners />
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/partner/:id">
        <ProtectedAdminRoute>
          <AdminPartnerDetail />
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin/partner-withdrawals">
        <ProtectedAdminRoute>
          <AdminPartnerWithdrawals />
        </ProtectedAdminRoute>
      </Route>

      {/* 🤝 Partner Routes - Completely Separate System */}
      <Route path="/partner/login" component={PartnerLogin} />
      <Route path="/partner/signup" component={PartnerSignup} />
      <Route path="/partner/dashboard">
        <ProtectedPartnerRoute>
          <PartnerGameHistory />
        </ProtectedPartnerRoute>
      </Route>
      <Route path="/partner/wallet">
        <ProtectedPartnerRoute>
          <PartnerProfile />
        </ProtectedPartnerRoute>
      </Route>
      <Route path="/partner/profile">
        <ProtectedPartnerRoute>
          <PartnerProfile />
        </ProtectedPartnerRoute>
      </Route>

      <Route path="/unauthorized" component={Unauthorized} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <Router />
      </AppProviders>
    </ErrorBoundary>
  );
}

export default App;
