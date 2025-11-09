import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Key, Eye, EyeOff, AlertCircle } from "lucide-react";

interface UserPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    fullName: string;
    phone: string;
  };
  onResetPassword: (userId: string, newPassword: string) => Promise<void>;
}

export default function UserPasswordModal({
  isOpen,
  onClose,
  user,
  onResetPassword
}: UserPasswordModalProps) {
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validation
    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      await onResetPassword(user.id, newPassword);
      
      // Reset form
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      onClose();
    } catch (error: any) {
      console.error('Failed to reset password:', error);
      setError(error.message || 'Failed to reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] bg-purple-950/95 border-purple-400/30">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Key className="w-5 h-5" />
            Reset User Password
          </DialogTitle>
          <DialogDescription className="text-purple-200">
            Set a new password for {user.fullName}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* User Info */}
          <div className="flex items-center justify-between p-3 bg-purple-900/50 rounded-lg">
            <div>
              <p className="text-white font-medium">{user.fullName}</p>
              <p className="text-purple-300 text-sm">{user.phone}</p>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-white">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-purple-950/30 border-purple-400/30 text-white placeholder:text-purple-300/50 pr-10"
                disabled={isSubmitting}
                autoComplete="new-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-purple-300 hover:text-white"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-white">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-purple-950/30 border-purple-400/30 text-white placeholder:text-purple-300/50 pr-10"
                disabled={isSubmitting}
                autoComplete="new-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-purple-300 hover:text-white"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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

          {/* Password Requirements */}
          <div className="bg-purple-900/30 border border-purple-400/20 rounded-lg p-3">
            <p className="text-purple-200 text-xs font-medium mb-2">Password Requirements:</p>
            <ul className="text-purple-300 text-xs space-y-1">
              <li className="flex items-center gap-1">
                <span className={newPassword.length >= 6 ? "text-green-400" : ""}>
                  • At least 6 characters
                </span>
              </li>
              <li className="flex items-center gap-1">
                <span className={newPassword && confirmPassword && newPassword === confirmPassword ? "text-green-400" : ""}>
                  • Passwords must match
                </span>
              </li>
            </ul>
          </div>
        </form>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="border-purple-400/30 text-purple-200 hover:bg-purple-400/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !newPassword || newPassword.length < 6 || newPassword !== confirmPassword}
            className="bg-gradient-to-r from-gold to-yellow-600 hover:from-yellow-500 hover:to-yellow-500 text-black font-semibold"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Resetting...
              </>
            ) : (
              <>
                <Key className="w-4 h-4 mr-2" />
                Reset Password
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
