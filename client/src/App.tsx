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
import GameHistoryPage from "@/pages/GameHistoryPage.tsx";

import Login from "@/pages/login.tsx";
import Signup from "@/pages/signup.tsx";
import AdminLogin from "@/pages/admin-login.tsx";
import Profile from "@/pages/profile.tsx";
import NotFound from "@/pages/not-found.tsx";
import Unauthorized from "@/pages/unauthorized.tsx";
import ProtectedAdminRoute from "@/components/ProtectedAdminRoute.tsx";
import ErrorBoundary from "@/components/ErrorBoundary.tsx";
import AppProviders from "@/providers/AppProviders.tsx";
import { UserProfileProvider } from "@/contexts/UserProfileContext";

function Router() {
  return (
    <Switch>
      {/* Homepage - Default route */}
      <Route path="/" component={Index} />
      
      {/* Public routes */}
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/admin-login" component={AdminLogin} />
      
      {/* Player Game Routes */}
      <Route path="/play" component={PlayerGame} />
      <Route path="/player-game" component={PlayerGame} />
      
      {/* Profile Routes */}
      <Route path="/profile" component={Profile} />
      
      {/* Admin Routes - Protected and hidden from public routing */}
      {/* These routes will be accessed directly via URL only by admins who know the exact paths */}
      <Route path="/admin">
        <ProtectedAdminRoute>
          <Admin />
        </ProtectedAdminRoute>
      </Route>
      <Route path="/game">
        <ProtectedAdminRoute>
          <AdminGame />
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin-game">
        <ProtectedAdminRoute>
          <AdminGame />
        </ProtectedAdminRoute>
      </Route>
      <Route path="/game-admin">
        <ProtectedAdminRoute>
          <AdminGame />
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin-control">
        <ProtectedAdminRoute>
          <AdminGame />
        </ProtectedAdminRoute>
      </Route>
      <Route path="/user-admin">
        <ProtectedAdminRoute>
          <UserAdmin />
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin-analytics">
        <ProtectedAdminRoute>
          <AdminAnalytics />
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin-payments">
        <ProtectedAdminRoute>
          <AdminPayments />
        </ProtectedAdminRoute>
      </Route>
      <Route path="/admin-bonus">
        <ProtectedAdminRoute>
          <AdminBonus />
        </ProtectedAdminRoute>
      </Route>
      <Route path="/backend-settings">
        <ProtectedAdminRoute>
          <BackendSettings />
        </ProtectedAdminRoute>
      </Route>
      <Route path="/game-history">
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
        <UserProfileProvider>
          <Router />
        </UserProfileProvider>
      </AppProviders>
    </ErrorBoundary>
  );
}

export default App;
