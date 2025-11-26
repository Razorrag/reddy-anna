// 🤝 PARTNER LOGIN PAGE
// Completely separate from player login
import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, Users, AlertCircle, MessageCircle } from "lucide-react";
import { usePartnerAuth } from "@/contexts/PartnerAuthContext";
import { getSupportWhatsAppNumberAsync, createWhatsAppUrl } from "@/lib/whatsapp-helper";

export default function PartnerLogin() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    phone: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = usePartnerAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/partner/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formData.phone,
          password: formData.password
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Login failed');
        return;
      }

      // Login successful
      login(data.partner, data.token, data.refreshToken);
      setLocation('/partner/dashboard');
    } catch (err: any) {
      console.error('Partner login error:', err);
      setError('Unable to connect to server. Please try again.');
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

  const handleForgotPassword = async () => {
    const partnerPhone = formData.phone || "your_phone_number";
    const message = `Hello Admin,\n\nI am a Partner and need help resetting my password.\n\nMy Phone Number: ${partnerPhone}\n\nPlease help me reset my partner account password.\n\nThank you!`;
    const adminNumber = await getSupportWhatsAppNumberAsync();
    const whatsappUrl = createWhatsAppUrl(adminNumber, message);
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-violet-900 flex items-center justify-center p-4">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 bg-purple-500/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-indigo-500/20 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-20 w-24 h-24 bg-violet-500/20 rounded-full blur-xl animate-pulse delay-500"></div>
      </div>

      {/* Login Card */}
      <Card className="w-full max-w-md bg-black/40 border-purple-500/30 backdrop-blur-sm relative z-10">
        <CardHeader className="text-center pb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-purple-400 mb-2">
            Partner Login
          </CardTitle>
          <CardDescription className="text-gray-400 text-lg">
            Sign in to your partner dashboard
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Phone Field */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-purple-400 font-semibold">
                Mobile Number
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="Enter your mobile number"
                value={formData.phone}
                onChange={handleChange}
                className="bg-black/30 border-purple-500/30 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400"
                required
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-purple-400 font-semibold">
                  Password
                </Label>
                <Button
                  type="button"
                  variant="link"
                  className="text-purple-400 hover:text-purple-300 text-sm p-0 h-auto font-normal"
                  onClick={handleForgotPassword}
                >
                  <MessageCircle className="w-3 h-3 mr-1" />
                  Forgot Password?
                </Button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  className="bg-black/30 border-purple-500/30 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400 pr-12"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-400 hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-purple-300/70 mt-1">
                Click "Forgot Password?" to contact admin via WhatsApp
              </p>
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
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 text-lg py-3 font-semibold shadow-lg hover:shadow-purple-500/30 transition-all duration-300"
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

            {/* Sign Up Link */}
            <div className="text-center pt-2">
              <span className="text-white/80">
                Don't have a partner account?{' '}
                <Link href="/partner/signup" className="text-purple-400 hover:text-purple-300 font-semibold transition-colors">
                  Register Now
                </Link>
              </span>
            </div>

            {/* Back to Home */}
            <div className="text-center">
              <Link href="/" className="text-white/60 hover:text-white transition-colors text-sm">
                ← Back to Home
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
