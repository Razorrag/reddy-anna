import React, { useState } from 'react';
import { X, Send, DollarSign, CreditCard, MessageCircle, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  userPhone?: string;
  userId?: string;
}

type RequestType = 'withdrawal' | 'deposit' | 'support' | 'balance';

const WhatsAppModal: React.FC<WhatsAppModalProps> = ({ isOpen, onClose, userPhone, userId }) => {
  const [requestType, setRequestType] = useState<RequestType | null>(null);
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!requestType) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/whatsapp/send-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId || 'guest',
          userPhone: userPhone || 'Not provided',
          requestType,
          message: message || getDefaultMessage(),
          amount: amount ? parseFloat(amount) : undefined,
          metadata: {
            timestamp: new Date().toISOString(),
            requestType
          }
        }),
      });

      const data = await response.json();

      if (data.success && data.whatsappUrl) {
        // Open WhatsApp with pre-filled message
        window.open(data.whatsappUrl, '_blank');
        
        // Close modal after a short delay
        setTimeout(() => {
          onClose();
          resetForm();
        }, 500);
      } else {
        alert('Failed to open WhatsApp. Please try again.');
      }
    } catch (error) {
      console.error('WhatsApp request error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDefaultMessage = () => {
    switch (requestType) {
      case 'withdrawal':
        return `I would like to withdraw ₹${amount || '___'} from my account.`;
      case 'deposit':
        return `I would like to deposit ₹${amount || '___'} to my account.`;
      case 'balance':
        return 'I would like to check my current balance.';
      case 'support':
        return 'I need assistance with my account.';
      default:
        return '';
    }
  };

  const resetForm = () => {
    setRequestType(null);
    setAmount('');
    setMessage('');
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md bg-white shadow-2xl animate-in fade-in zoom-in duration-200">
        <CardHeader className="relative border-b">
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Contact Admin
          </CardTitle>
          <CardDescription>
            Select a request type to send a message via WhatsApp
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6">
          {!requestType ? (
            // Request Type Selection
            <div className="space-y-3">
              <button
                onClick={() => setRequestType('withdrawal')}
                className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-all group"
              >
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center group-hover:bg-red-500 transition-colors">
                  <DollarSign className="w-6 h-6 text-red-600 group-hover:text-white" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-900">Withdrawal Request</div>
                  <div className="text-sm text-gray-500">Withdraw money from your account</div>
                </div>
              </button>

              <button
                onClick={() => setRequestType('deposit')}
                className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group"
              >
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-500 transition-colors">
                  <CreditCard className="w-6 h-6 text-green-600 group-hover:text-white" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-900">Deposit Request</div>
                  <div className="text-sm text-gray-500">Add money to your account</div>
                </div>
              </button>

              <button
                onClick={() => setRequestType('balance')}
                className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                  <MessageCircle className="w-6 h-6 text-blue-600 group-hover:text-white" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-900">Balance Inquiry</div>
                  <div className="text-sm text-gray-500">Check your current balance</div>
                </div>
              </button>

              <button
                onClick={() => setRequestType('support')}
                className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group"
              >
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-500 transition-colors">
                  <HelpCircle className="w-6 h-6 text-purple-600 group-hover:text-white" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-900">Support Request</div>
                  <div className="text-sm text-gray-500">Get help with any issue</div>
                </div>
              </button>
            </div>
          ) : (
            // Request Form
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRequestType(null)}
                  className="text-gray-600"
                >
                  ← Back
                </Button>
                <span className="text-sm text-gray-500">
                  {requestType === 'withdrawal' && 'Withdrawal Request'}
                  {requestType === 'deposit' && 'Deposit Request'}
                  {requestType === 'balance' && 'Balance Inquiry'}
                  {requestType === 'support' && 'Support Request'}
                </span>
              </div>

              {(requestType === 'withdrawal' || requestType === 'deposit') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (₹) *
                  </label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full"
                    min="100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum: ₹100
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Message (Optional)
                </label>
                <Textarea
                  placeholder={getDefaultMessage()}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full min-h-[100px]"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> This will open WhatsApp on your device with a pre-filled message to the admin.
                </p>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || ((requestType === 'withdrawal' || requestType === 'deposit') && !amount)}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {isSubmitting ? (
                  'Opening WhatsApp...'
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Open WhatsApp
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppModal;
