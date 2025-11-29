import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface WithdrawalRequest {
  id: string;
  amount: string;
  status: string;
  created_at: string;
  processed_at: string | null;
  rejection_reason: string | null;
  payment_reference: string | null;
}

interface WithdrawalRequestsTableProps {
  requests: WithdrawalRequest[];
  loading?: boolean;
}

export default function WithdrawalRequestsTable({ requests, loading }: WithdrawalRequestsTableProps) {
  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-yellow-900/30 text-yellow-400 border-yellow-500/30">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-green-900/30 text-green-400 border-green-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-900/30 text-red-400 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-900/30 text-gray-400 border-gray-500/30">
            {status}
          </Badge>
        );
    }
  };

  return (
    <Card className="bg-black/40 border-purple-500/30">
      <CardHeader>
        <CardTitle className="text-purple-400 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Withdrawal Requests
        </CardTitle>
        <CardDescription className="text-gray-400">
          Track your withdrawal request status
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto"></div>
            <p className="text-gray-400 mt-2">Loading requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">No withdrawal requests yet</p>
            <p className="text-gray-500 text-sm mt-1">Your requests will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div 
                key={request.id}
                className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {formatCurrency(request.amount)}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Requested: {formatDate(request.created_at)}
                    </div>
                  </div>
                  <div>
                    {getStatusBadge(request.status)}
                  </div>
                </div>

                {request.processed_at && (
                  <div className="text-xs text-gray-500 mt-2">
                    Processed: {formatDate(request.processed_at)}
                  </div>
                )}

                {request.payment_reference && (
                  <div className="text-xs text-green-400 mt-2">
                    Reference: {request.payment_reference}
                  </div>
                )}

                {request.rejection_reason && (
                  <div className="text-xs text-red-400 mt-2 bg-red-900/20 p-2 rounded">
                    Reason: {request.rejection_reason}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}