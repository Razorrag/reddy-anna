import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, UserPlus, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

export default function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
    referralCode: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    // Basic validation
    const newErrors: Record<string, string> = {};
    
    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }
    
    if (!formData.phone || formData.phone.length < 10) {
      newErrors.phone = "Please enter a valid 10-digit phone number";
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords don't match";
    }
    
    // Match backend validation: 8+ chars with uppercase, lowercase, and number
    if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      newErrors.password = "Password must contain uppercase, lowercase, and number";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
      return;
    }

    try {
      console.log('Sending registration request for:', formData.phone); // Debug log
      
      // Make API call using phone as primary identifier
      const response = await apiClient.post<any>('/auth/register', {
        name: formData.name,
        phone: formData.phone,        // Use phone number as identifier
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        referralCode: formData.referralCode || undefined // Optional referral code
      });

      console.log('Registration response:', response); // Debug log

      // Show success message
      setSuccess(true);
      setApiError('');

      // Store user data and redirect to player game
      const userData = {
        id: response.user?.id || response.id, // Phone number as ID
        phone: response.user?.phone || formData.phone, // Store phone separately
        balance: response.user?.balance || response.balance || 0,
        role: response.user?.role || 'player'
      };

      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('userRole', 'player');

      // CRITICAL: Ensure token is stored (check multiple sources)
      const token = response.token || response.user?.token;
      if (!token) {
        console.error('❌ No token received from server');
        setApiError('Registration failed - no token received. Please try again.');
        setSuccess(false);
        return;
      }
      localStorage.setItem('token', token);
      console.log('✅ Token stored successfully');

      // Redirect after 1 second to show success message
      setTimeout(() => {
        window.location.href = '/game';
      }, 1000);
    } catch (err: any) {
      console.error('Signup error:', err);
      setApiError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));

    // Clear error when user starts typing
    if (errors[e.target.name]) {
      setErrors(prev => ({
        ...prev,
        [e.target.name]: ''
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gold/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-purple-500/10 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-20 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl animate-pulse delay-500"></div>
      </div>

      {/* Signup Card */}
      <Card className="w-full max-w-md bg-black/40 border-gold/30 backdrop-blur-sm relative z-10">
        <CardHeader className="text-center pb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <UserPlus className="w-10 h-10 text-black" />
          </div>
          <CardTitle className="text-3xl font-bold text-gold mb-2">
            Join Reddy Anna
          </CardTitle>
          <CardDescription className="text-gray-400 text-lg">
            Create your account to start playing
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gold font-semibold">
                Full Name
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
                className="bg-black/30 border-gold/30 text-white placeholder:text-gray-400 focus:border-gold focus:ring-gold"
                required
              />
              {errors.name && (
                <p className="text-red-500 text-sm">{errors.name}</p>
              )}
            </div>

            {/* Phone Field */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-gold font-semibold">
                Phone Number
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={handleChange}
                className="bg-black/30 border-gold/30 text-white placeholder:text-gray-400 focus:border-gold focus:ring-gold"
                required
              />
              {errors.phone && (
                <p className="text-red-500 text-sm">{errors.phone}</p>
              )}
            </div>

            {/* Referral Code Field */}
            <div className="space-y-2">
              <Label htmlFor="referralCode" className="text-gold font-semibold">
                Referral Code <span className="text-white/60 text-xs font-normal">(Optional)</span>
              </Label>
              <Input
                id="referralCode"
                name="referralCode"
                type="text"
                placeholder="Enter referral code if you have one"
                value={formData.referralCode}
                onChange={handleChange}
                className="bg-black/30 border-gold/30 text-white placeholder:text-gray-400 focus:border-gold focus:ring-gold"
              />
              {errors.referralCode && (
                <p className="text-red-500 text-sm">{errors.referralCode}</p>
              )}
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
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={handleChange}
                  className={cn(
                    "bg-black/30 border-gold/30 text-white placeholder:text-gray-400 focus:border-gold focus:ring-gold pr-12",
                    errors.password && "border-red-500"
                  )}
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
              {errors.password && (
                <p className="text-red-500 text-sm">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gold font-semibold">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={cn(
                    "bg-black/30 border-gold/30 text-white placeholder:text-gray-400 focus:border-gold focus:ring-gold pr-12",
                    errors.confirmPassword && "border-red-500"
                  )}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-400 hover:text-white"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm">{errors.confirmPassword}</p>
              )}
            </div>

            {/* API Error Message */}
            {apiError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{apiError}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-green-400 text-sm">Account created successfully! Redirecting...</p>
              </div>
            )}

            {/* Terms and Conditions */}
            <div className="flex items-start text-sm">
              <input
                type="checkbox"
                id="terms"
                className="mr-2 mt-1 w-4 h-4 text-gold bg-black/30 border-gold/30 rounded focus:ring-gold focus:ring-offset-0"
                required
              />
              <label htmlFor="terms" className="text-white/80">
                I agree to the{' '}
                <Link href="/terms" className="text-gold hover:text-gold-light transition-colors">
                  Terms of Service
                </Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-gold hover:text-gold-light transition-colors">
                  Privacy Policy
                </Link>
              </label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-gold to-yellow-600 text-black hover:from-yellow-500 hover:to-gold text-lg py-3 font-semibold shadow-lg hover:shadow-gold/30 transition-all duration-300"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creating Account...
                </div>
              ) : (
                <>
                  <UserPlus className="w-5 h-5 mr-2" />
                  Create Account
                </>
              )}
            </Button>

            {/* Back to Home */}
            <div className="text-center">
              <Link href="/" className="text-white/80 hover:text-gold transition-colors">
                ← Back to Home
              </Link>
            </div>

            {/* Sign In Link */}
            <div className="text-center pt-4">
              <span className="text-white/80">
                Already have an account?{' '}
                <Link href="/login" className="text-gold hover:text-gold-light font-semibold transition-colors">
                  Sign in here
                </Link>
              </span>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
