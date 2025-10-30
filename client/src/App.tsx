import { Switch, Route } from "wouter";
import Index from "@/pages/index.tsx";
import PlayerGame from "@/pages/player-game.tsx";
import Admin from "@/pages/admin.tsx";
import AdminGame from "@/pages/admin-game.tsx";
import UserAdmin from "@/pages/user-admin.tsx";
import AdminAnalytics from "@/pages/admin-analytics.tsx";
import AdminPayments from "@/pages/admin-payments.tsx";
import AdminBonus from "@/pages/admin-bonus.tsx";
import BackendSettings from "@/pages/backend-settings.tsx";
import AdminWhatsAppSettings from "@/pages/admin-whatsapp-settings.tsx";
import AdminStreamSettings from "@/pages/admin-stream-settings.tsx";
import GameHistoryPage from "@/pages/GameHistoryPage.tsx";

import Login from "@/pages/login.tsx";
import Signup from "@/pages/signup.tsx";
import AdminLogin from "@/pages/admin-login.tsx";
import Profile from "@/pages/profile.tsx";
import NotFound from "@/pages/not-found.tsx";
import Unauthorized from "@/pages/unauthorized.tsx";
import ProtectedRoute from "@/components/ProtectedRoute.tsx";
import ProtectedAdminRoute from "@/components/ProtectedAdminRoute.tsx";
import ErrorBoundary from "@/components/ErrorBoundary.tsx";
import AppProviders from "@/providers/AppProviders.tsx";
import Navbar from "@/components/Navbar.tsx";

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
      
      <Route path="/unauthorized" component={Unauthorized} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <Navbar />
        <Router />
      </AppProviders>
    </ErrorBoundary>
  );
}

export default App;
