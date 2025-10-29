import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, User, AlertCircle, Shield } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const [formData, setFormData] = useState({
    phone: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // --- ADD THIS BLOCK ---
    // Force disconnect any existing WebSocket connection to prevent auth conflicts
    const existingWs = (window as any).gameWebSocket;
    if (existingWs) {
      console.log('Force-disconnecting existing WebSocket before player login...');
      existingWs.close(1000, 'User re-authenticating as player');
      delete (window as any).gameWebSocket;
    }
    // --- END OF FIX ---

    setIsLoading(true);
    setError('');

    try {
      console.log('Sending login request for:', formData.phone);
      
      // User login only
      // IMPORTANT: skipAuth: true to prevent sending Authorization header
      const response = await apiClient.post<any>('/auth/login', {
        phone: formData.phone,
        password: formData.password
      }, { skipAuth: true });

      // Prepare user data for auth context
      const userData = {
        id: response.user?.id || response.id,
        phone: response.user?.phone || formData.phone,
        balance: response.user?.balance || response.balance || 0,
        role: response.user?.role || 'player'
      };

      // CRITICAL: Ensure token is stored (check multiple sources)
      const token = response.token || response.user?.token;
      if (!token) {
        console.error('❌ No token received from server');
        setError('Authentication failed - no token received. Please try again.');
        return;
      }

      // Use auth context to handle login
      login(userData, token);
      console.log('✅ Login successful');

      // Redirect to game after a short delay to allow WebSocket to authenticate
      setTimeout(() => {
        window.location.href = '/play';
      }, 1000);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Invalid phone number or password');
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
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gold/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-purple-500/10 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-20 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl animate-pulse delay-500"></div>
      </div>

      {/* Login Card */}
      <Card className="w-full max-w-md bg-black/40 border-gold/30 backdrop-blur-sm relative z-10">
        <CardHeader className="text-center pb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="w-10 h-10 text-black" />
          </div>
          <CardTitle className="text-3xl font-bold text-gold mb-2">
            Welcome Back
          </CardTitle>
          <CardDescription className="text-gray-400 text-lg">
            Sign in to your account to play
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Phone/Username Field */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-gold font-semibold">
                Mobile Number
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="Enter your mobile number"
                value={formData.phone}
                onChange={handleChange}
                className="bg-black/30 border-gold/30 text-white placeholder:text-gray-400 focus:border-gold focus:ring-gold"
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
                  className="bg-black/30 border-gold/30 text-white placeholder:text-gray-400 focus:border-gold focus:ring-gold pr-12"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-400 hover:text-white"
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
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-gold to-yellow-600 text-black hover:from-yellow-500 hover:to-gold text-lg py-3 font-semibold shadow-lg hover:shadow-gold/30 transition-all duration-300"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Signing In...
                </div>
              ) : (
                'Sign In'
              )}
            </Button>

            {/* No admin toggle - admin access is hidden */}

            {/* Sign Up Link */}
            <div className="text-center pt-2">
              <span className="text-white/80">
                Don't have an account?{' '}
                <Link href="/signup" className="text-gold hover:text-gold-light font-semibold transition-colors">
                  Sign Up
                </Link>
              </span>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
