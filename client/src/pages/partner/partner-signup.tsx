// 🤝 PARTNER SIGNUP PAGE
// Completely separate from player signup
import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, UserPlus, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePartnerAuth } from "@/contexts/PartnerAuthContext";

export default function PartnerSignup() {
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const { login } = usePartnerAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    setApiError('');

    // Validation
    const newErrors: Record<string, string> = {};
    
    if (!formData.phone || formData.phone.length < 8) {
      newErrors.phone = "Please enter a valid phone number";
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords don't match";
    }
    
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      newErrors.password = "Password must be at least 8 characters with uppercase, lowercase, and number";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/partner/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Partner_${formData.phone}`, // Auto-generate name from phone
          phone: formData.phone,
          password: formData.password,
          confirmPassword: formData.confirmPassword
        })
      });

      const data = await response.json();

      if (response.status === 202) {
        // Pending approval
        setSuccess(true);
        setIsPending(true);
        return;
      }

      if (!response.ok || !data.success) {
        setApiError(data.error || 'Registration failed');
        return;
      }

      // Auto-approved - login and redirect
      setSuccess(true);
      login(data.partner, data.token, data.refreshToken);
      
      setTimeout(() => {
        window.location.href = '/partner/dashboard';
      }, 1500);
    } catch (err: any) {
      console.error('Partner signup error:', err);
      setApiError('Unable to connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    if (errors[e.target.name]) {
      setErrors(prev => ({ ...prev, [e.target.name]: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-violet-900 flex items-center justify-center p-4">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 bg-purple-500/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-indigo-500/20 rounded-full blur-xl animate-pulse delay-1000"></div>
      </div>

      {/* Signup Card */}
      <Card className="w-full max-w-md bg-black/40 border-purple-500/30 backdrop-blur-sm relative z-10 my-8">
        <CardHeader className="text-center pb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <UserPlus className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-purple-400 mb-2">
            Become a Partner
          </CardTitle>
          <CardDescription className="text-gray-400 text-lg">
            Register with your phone number
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Phone Field */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-purple-400 font-semibold">
                Phone Number *
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={handleChange}
                className="bg-black/30 border-purple-500/30 text-white placeholder:text-gray-400 focus:border-purple-400"
                required
              />
              {errors.phone && <p className="text-red-500 text-sm">{errors.phone}</p>}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-purple-400 font-semibold">
                Password *
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
                    "bg-black/30 border-purple-500/30 text-white placeholder:text-gray-400 focus:border-purple-400 pr-12",
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
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
              <p className="text-xs text-gray-500">Min 8 chars with uppercase, lowercase, and number</p>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-purple-400 font-semibold">
                Confirm Password *
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
                    "bg-black/30 border-purple-500/30 text-white placeholder:text-gray-400 focus:border-purple-400 pr-12",
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
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.confirmPassword && <p className="text-red-500 text-sm">{errors.confirmPassword}</p>}
            </div>

            {/* API Error */}
            {apiError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{apiError}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className={cn(
                "border rounded-lg p-3 flex items-start gap-2",
                isPending 
                  ? "bg-yellow-500/10 border-yellow-500/30" 
                  : "bg-green-500/10 border-green-500/30"
              )}>
                <CheckCircle className={cn(
                  "w-5 h-5 flex-shrink-0 mt-0.5",
                  isPending ? "text-yellow-500" : "text-green-500"
                )} />
                <p className={isPending ? "text-yellow-400 text-sm" : "text-green-400 text-sm"}>
                  {isPending 
                    ? "Registration submitted! Your account is pending admin approval. You will be notified once approved."
                    : "Account created successfully! Redirecting to dashboard..."
                  }
                </p>
              </div>
            )}

            {/* Terms */}
            <div className="flex items-start text-sm">
              <input
                type="checkbox"
                id="terms"
                className="mr-2 mt-1 w-4 h-4 text-purple-500 bg-black/30 border-purple-500/30 rounded focus:ring-purple-400"
                required
              />
              <label htmlFor="terms" className="text-white/80">
                I agree to the Partner{' '}
                <Link href="/terms" className="text-purple-400 hover:text-purple-300">Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-purple-400 hover:text-purple-300">Privacy Policy</Link>
              </label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 text-lg py-3 font-semibold shadow-lg hover:shadow-purple-500/30 transition-all duration-300"
              disabled={isLoading || success}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creating Account...
                </div>
              ) : (
                <>
                  <UserPlus className="w-5 h-5 mr-2" />
                  Register as Partner
                </>
              )}
            </Button>

            {/* Login Link */}
            <div className="text-center pt-2">
              <span className="text-white/80">
                Already a partner?{' '}
                <Link href="/partner/login" className="text-purple-400 hover:text-purple-300 font-semibold">
                  Sign in here
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
