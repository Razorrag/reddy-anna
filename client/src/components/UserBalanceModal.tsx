import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/services/userAdminService";
import { Loader2, Plus, Minus } from "lucide-react";

interface UserBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    fullName: string;
    phone: string;
    balance: number;
    status: string;
  };
  onUpdateBalance: (userId: string, update: {
    amount: number;
    type: 'add' | 'subtract';
    reason: string;
  }) => Promise<void>;
}

export default function UserBalanceModal({
  isOpen,
  onClose,
  user,
  onUpdateBalance
}: UserBalanceModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [type, setType] = useState<'add' | 'subtract'>('add');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      return;
    }
    
    if (!reason.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onUpdateBalance(user.id, {
        amount: parseFloat(amount),
        type,
        reason: reason.trim()
      });
      
      // Reset form
      setAmount('');
      setReason('');
      setType('add');
      onClose();
    } catch (error) {
      console.error('Failed to update balance:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setAmount('');
      setReason('');
      setType('add');
      onClose();
    }
  };

  const newBalance = type === 'add' 
    ? user.balance + parseFloat(amount || '0')
    : user.balance - parseFloat(amount || '0');

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] bg-purple-950/95 border-purple-400/30">
        <DialogHeader>
          <DialogTitle className="text-white">Update User Balance</DialogTitle>
          <DialogDescription className="text-purple-200">
            Add or subtract funds from {user.fullName}'s account
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* User Info */}
          <div className="flex items-center justify-between p-3 bg-purple-900/50 rounded-lg">
            <div>
              <p className="text-white font-medium">{user.fullName}</p>
              <p className="text-purple-300 text-sm">{user.phone}</p>
            </div>
            <div className="text-right">
              <p className="text-purple-300 text-sm">Current Balance</p>
              <p className="text-white font-bold">{formatCurrency(user.balance)}</p>
            </div>
          </div>

          {/* Transaction Type */}
          <div className="space-y-2">
            <Label htmlFor="type" className="text-white">Transaction Type</Label>
            <Select value={type} onValueChange={(value: 'add' | 'subtract') => setType(value)}>
              <SelectTrigger className="bg-purple-950/30 border-purple-400/30 text-white">
                <SelectValue placeholder="Select transaction type" />
              </SelectTrigger>
              <SelectContent className="bg-purple-950/95 border-purple-400/30">
                <SelectItem value="add" className="text-green-400">
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Funds
                  </div>
                </SelectItem>
                <SelectItem value="subtract" className="text-red-400">
                  <div className="flex items-center gap-2">
                    <Minus className="w-4 h-4" />
                    Subtract Funds
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-white">Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              step="0.01"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-purple-950/30 border-purple-400/30 text-white placeholder:text-purple-300/50"
              disabled={isSubmitting}
            />
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-white">Reason</Label>
            <Textarea
              id="reason"
              placeholder="Enter reason for balance update"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="bg-purple-950/30 border-purple-400/30 text-white placeholder:text-purple-300/50 resize-none"
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          {/* Preview */}
          {amount && parseFloat(amount) > 0 && (
            <div className="p-3 bg-purple-900/50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-purple-300">New Balance:</span>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={type === 'add' 
                      ? 'border-green-500/30 text-green-400 bg-green-500/10' 
                      : 'border-red-500/30 text-red-400 bg-red-500/10'
                    }
                  >
                    {type === 'add' ? '+' : '-'}{formatCurrency(parseFloat(amount))}
                  </Badge>
                  <span className="text-white font-bold">{formatCurrency(newBalance)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

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
            disabled={isSubmitting || !amount || parseFloat(amount) <= 0 || !reason.trim()}
            className={type === 'add' 
              ? "bg-green-600 hover:bg-green-700" 
              : "bg-red-600 hover:bg-red-700"
            }
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {type === 'add' ? (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Funds
                  </>
                ) : (
                  <>
                    <Minus className="w-4 h-4 mr-2" />
                    Subtract Funds
                  </>
                )}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}