
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

const Navbar = () => {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  // Hide navbar on game pages to avoid UI clash
  // Game pages use MobileTopBar instead
  const hideOnGamePages = ['/game', '/play', '/player-game', '/admin/game'];
  const shouldHide = hideOnGamePages.some(path => location.startsWith(path));

  if (shouldHide) {
    return null; // Don't render navbar on game pages
  }

  return (
    <nav className="bg-gray-800 p-4 text-white">
      <div className="container mx-auto flex justify-between">
        <Link href="/" className="text-xl font-bold">
          Andar Bahar
        </Link>
        <div>
          {user ? (
            <>
              {user.role === "admin" ? (
                <>
                  <Link href="/admin" className="mr-4">
                    Admin Dashboard
                  </Link>
                  <Link href="/admin/game" className="mr-4">
                    Game Control
                  </Link>
                  <Link href="/admin/users" className="mr-4">
                    User Management
                  </Link>
                </>
              ) : (
                <Link href="/game" className="mr-4">
                  Play Game
                </Link>
              )}
              <Link href="/profile" className="mr-4">
                Profile
              </Link>
              <button onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <Link href="/login" className="mr-4">
                Login
              </Link>
              <Link href="/signup" className="mr-4">
                Signup
              </Link>
              <Link href="/admin-login">Admin Login</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
