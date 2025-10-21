import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Shield, AlertCircle } from "lucide-react";
// import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

export default function AdminLogin() {
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
      // Make real API call to admin login endpoint
      const response = await apiClient.post<any>('/auth/admin/login', {
        email: formData.username + '@reddyanna.com', // Generate email from username
        password: formData.password
      });

      // Set admin user data in localStorage from backend response
      const adminUser = {
        id: response.admin?.id || response.id,
        username: response.admin?.username || response.username,
        role: 'admin', // Backend should verify this
        balance: response.admin?.balance || response.balance || 0
      };
      
      localStorage.setItem('user', JSON.stringify(adminUser));
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userRole', 'admin');
      
      // Redirect to admin panel after successful login
      window.location.href = '/admin';
    } catch (err: any) {
      console.error('Admin login error:', err);
      setError(err.message || 'Invalid admin credentials. Please try again.');
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

      {/* Admin Login Card */}
      <Card className="w-full max-w-md bg-black/50 border-gold/30 backdrop-blur-sm relative z-10">
        <CardHeader className="text-center pb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-black" />
          </div>
          <CardTitle className="text-3xl font-bold text-gold mb-2">
            Admin Access
          </CardTitle>
          <CardDescription className="text-white/80 text-lg">
            Administrator login portal
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-gold font-semibold">
                Admin Username
              </Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="Enter admin username"
                value={formData.username}
                onChange={handleChange}
                className="bg-black/50 border-gold/30 text-white placeholder:text-white/50 focus:border-gold focus:ring-gold"
                required
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gold font-semibold">
                Admin Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter admin password"
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

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-gold to-yellow-600 text-black hover:from-gold-light hover:to-yellow-500 text-lg py-3 font-semibold shadow-lg hover:shadow-gold/30 transition-all duration-300"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2"></div>
                  Authenticating...
                </div>
              ) : (
                <>
                  <Shield className="w-5 h-5 mr-2" />
                  Admin Login
                </>
              )}
            </Button>

            {/* Navigation Options */}
            <div className="flex flex-col gap-2">
              <div className="text-center">
                <Link href="/login" className="text-gold hover:text-gold-light font-semibold transition-colors">
                  ← Back to User Login
                </Link>
              </div>
              <div className="text-center">
                <Link href="/" className="text-white/80 hover:text-gold transition-colors">
                  Back to Home
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
