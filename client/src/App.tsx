import { Switch, Route } from "wouter";
import Index from "@/pages/index.tsx";
import PlayerGame from "@/pages/player-game.tsx";
import Admin from "@/pages/admin.tsx";
import AdminGame from "@/pages/admin-game.tsx";
import UserAdmin from "@/pages/user-admin.tsx";
import BackendSettings from "@/pages/backend-settings.tsx";
import AdminLogin from "@/pages/admin-login.tsx";
import Login from "@/pages/login.tsx";
import Signup from "@/pages/signup.tsx";
import NotFound from "@/pages/not-found.tsx";
import Unauthorized from "@/pages/unauthorized.tsx";
import ProtectedRoute from "@/components/ProtectedRoute.tsx";
import ErrorBoundary from "@/components/ErrorBoundary.tsx";
import AppProviders from "@/providers/AppProviders.tsx";

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
      <Route path="/game" component={PlayerGame} />
      <Route path="/play" component={PlayerGame} />
      
      {/* Admin Routes */}
      <Route path="/admin" component={Admin} />
      <Route path="/admin-game" component={AdminGame} />
      <Route path="/game-admin" component={AdminGame} />
      <Route path="/admin-control" component={AdminGame} />
      <Route path="/user-admin" component={UserAdmin} />
      <Route path="/backend-settings" component={BackendSettings} />
      
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
