import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface WithdrawalModalProps {
  open: boolean;
  onClose: () => void;
  maxAmount: number;
  minAmount: number;
  onSuccess?: () => void;
}

export default function WithdrawalModal({
  open,
  onClose,
  maxAmount,
  minAmount,
  onSuccess,
}: WithdrawalModalProps) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const formatCurrency = (value: number) => {
    return '₹' + value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    const amountNum = parseFloat(amount);

    // Validation
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (amountNum < minAmount) {
      setError(`Minimum withdrawal amount is ${formatCurrency(minAmount)}`);
      return;
    }

    if (amountNum > maxAmount) {
      setError(`Insufficient balance. Available: ${formatCurrency(maxAmount)}`);
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('partner_token');
      
      const response = await fetch('/api/partner/wallet/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: amountNum }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit withdrawal request');
      }

      setSuccess(true);
      setAmount("");
      
      // Call success callback after a short delay
      setTimeout(() => {
        onSuccess?.();
        handleClose();
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Failed to submit withdrawal request');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setAmount("");
      setError("");
      setSuccess(false);
      onClose();
    }
  };

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
    setError("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-900 border-purple-500/30 text-white">
        <DialogHeader>
          <DialogTitle className="text-purple-400">Request Withdrawal</DialogTitle>
          <DialogDescription className="text-gray-400">
            Withdraw funds from your partner wallet
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-green-400 mb-2">Request Submitted!</h3>
            <p className="text-gray-400">
              Your withdrawal request has been submitted successfully.
              Admin will process it soon.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Balance Info */}
            <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Available Balance:</span>
                <span className="text-white font-semibold">{formatCurrency(maxAmount)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-gray-400">Minimum Withdrawal:</span>
                <span className="text-gray-300">{formatCurrency(minAmount)}</span>
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <Label htmlFor="amount" className="text-gray-300">Withdrawal Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError("");
                }}
                className="bg-black/30 border-purple-500/30 text-white mt-1"
                disabled={loading}
                min={minAmount}
                max={maxAmount}
                step="0.01"
              />
            </div>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {[5000, 10000, 25000, 50000].map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                  onClick={() => handleQuickAmount(value)}
                  disabled={loading || value > maxAmount}
                >
                  ₹{(value / 1000).toFixed(0)}K
                </Button>
              ))}
            </div>

            {/* Max Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
              onClick={() => handleQuickAmount(maxAmount)}
              disabled={loading}
            >
              Withdraw Maximum ({formatCurrency(maxAmount)})
            </Button>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="bg-red-900/20 border-red-500/50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Info Alert */}
            <Alert className="bg-blue-900/20 border-blue-500/30">
              <AlertCircle className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-gray-300 text-sm">
                Your withdrawal request will be sent to admin for approval. 
                Processing typically takes 24-48 hours.
              </AlertDescription>
            </Alert>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 border-gray-500/30 text-gray-300 hover:bg-gray-800/50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !amount || parseFloat(amount) < minAmount}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}