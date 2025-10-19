import { Switch, Route } from "wouter";
import PlayerGame from "@/pages/player-game";
import AdminGame from "@/pages/admin-game";
import Admin from "@/pages/admin";
import AdminLogin from "@/pages/admin-login";
import UserAdmin from "@/pages/user-admin";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import NotFound from "@/pages/not-found";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import AppProviders from "@/providers/AppProviders";

function Router() {
  return (
    <Switch>
      <Route path="/" component={PlayerGame} />
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
      
      <Route path="/user-admin">
        {() => (
          <ProtectedRoute component={UserAdmin} role="admin">
            <UserAdmin />
          </ProtectedRoute>
        )}
      </Route>
      
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
