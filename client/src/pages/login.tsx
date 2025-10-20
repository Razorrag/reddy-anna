import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, LogIn, AlertCircle } from "lucide-react";
// import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

export default function Login() {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Make real API call to login endpoint
      const response = await apiClient.post<any>('/api/auth/login', {
        username: formData.username,
        password: formData.password
      });

      // Store user data in localStorage for WebSocket authentication
      const userData = {
        id: response.id,
        username: response.username,
        balance: response.balance || 10000,
        role: 'player' // Regular user role
      };

      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userRole', 'player');

      // Redirect to player game after successful login
      window.location.href = '/game';
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Invalid username or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-purple-900/20 to-red-900/20 flex items-center justify-center p-4">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gold/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-purple-500/10 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-20 w-24 h-24 bg-red-500/10 rounded-full blur-xl animate-pulse delay-500"></div>
      </div>

      {/* Login Card */}
      <Card className="w-full max-w-md bg-black/50 border-gold/30 backdrop-blur-sm relative z-10">
        <CardHeader className="text-center pb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <LogIn className="w-10 h-10 text-black" />
          </div>
          <CardTitle className="text-3xl font-bold text-gold mb-2">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-white/80 text-lg">
            Sign in to your Reddy Anna account
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-gold font-semibold">
                Username
              </Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleChange}
                className="bg-black/50 border-gold/30 text-white placeholder:text-white/50 focus:border-gold focus:ring-gold"
                required
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gold font-semibold">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  className="bg-black/50 border-gold/30 text-white placeholder:text-white/50 focus:border-gold focus:ring-gold pr-12"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gold hover:text-gold-light"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center text-white/80">
                <input
                  type="checkbox"
                  className="mr-2 w-4 h-4 text-gold bg-black/50 border-gold/30 rounded focus:ring-gold focus:ring-offset-0"
                />
                Remember me
              </label>
              <Link href="/forgot-password" className="text-gold hover:text-gold-light transition-colors">
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-gold to-yellow-600 text-black hover:from-gold-light hover:to-yellow-500 text-lg py-3 font-semibold shadow-lg hover:shadow-gold/30 transition-all duration-300"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2"></div>
                  Signing In...
                </div>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Sign In
                </>
              )}
            </Button>

            {/* Back to Home */}
            <div className="text-center">
              <Link href="/" className="text-white/80 hover:text-gold transition-colors">
                ← Back to Home
              </Link>
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gold/30"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-black/50 text-white/60">Or continue with</span>
              </div>
            </div>

            {/* Social Login Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <Button
                type="button"
                variant="outline"
                className="border-gold/30 text-gold hover:bg-gold/10 hover:text-gold-light"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </Button>

              <Button
                type="button"
                variant="outline"
                className="border-gold/30 text-gold hover:bg-gold/10 hover:text-gold-light"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                </svg>
                Twitter
              </Button>
            </div>

            {/* Sign Up Link */}
            <div className="text-center pt-4">
              <span className="text-white/80">
                Don't have an account?{' '}
                <Link href="/signup" className="text-gold hover:text-gold-light font-semibold transition-colors">
                  Sign up here
                </Link>
              </span>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
