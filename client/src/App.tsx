import { Switch, Route } from "wouter";
import PlayerGame from "@/pages/player-game.tsx";
import AdminGame from "@/pages/admin-game.tsx";
import Admin from "@/pages/admin.tsx";
import AdminLogin from "@/pages/admin-login.tsx";
import UserAdmin from "@/pages/user-admin.tsx";
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
      <Route path="/" component={PlayerGame} />
      <Route path="/player-game" component={PlayerGame} />
      <Route path="/admin-login" component={AdminLogin} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      
      {/* Protected Admin Routes */}
      <Route path="/admin">
        {() => (
          <ProtectedRoute component={Admin} role="admin">
            <Admin />
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/admin-game">
        {() => (
          <ProtectedRoute component={AdminGame} role="admin">
            <AdminGame />
          </ProtectedRoute>
        )}
      </Route>
      
      {/* Alias route for game-admin */}
      <Route path="/game-admin">
        {() => (
          <ProtectedRoute component={AdminGame} role="admin">
            <AdminGame />
          </ProtectedRoute>
        )}
      </Route>
      
      {/* Main game route (admin panel) */}
      <Route path="/game">
        {() => (
          <ProtectedRoute component={AdminGame} role="admin">
            <AdminGame />
          </ProtectedRoute>
        )}
      </Route>
      
      <Route path="/user-admin">
        {() => (
          <ProtectedRoute component={UserAdmin} role="admin">
            <UserAdmin />
          </ProtectedRoute>
        )}
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
