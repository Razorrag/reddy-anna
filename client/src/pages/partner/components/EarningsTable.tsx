import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, Calendar, DollarSign } from "lucide-react";

interface Earning {
  id: string;
  game_id: string;
  shown_profit: string;
  earned_amount: string;
  commission_rate: string;
  share_percentage: string;
  credited_at: string;
}

interface EarningsTableProps {
  earnings: Earning[];
  loading?: boolean;
}

export default function EarningsTable({ earnings, loading }: EarningsTableProps) {
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

  return (
    <Card className="bg-black/40 border-purple-500/30">
      <CardHeader>
        <CardTitle className="text-purple-400 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Recent Earnings
        </CardTitle>
        <CardDescription className="text-gray-400">
          Commission earned from profitable games
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto"></div>
            <p className="text-gray-400 mt-2">Loading earnings...</p>
          </div>
        ) : earnings.length === 0 ? (
          <div className="text-center py-8">
            <DollarSign className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">No earnings yet</p>
            <p className="text-gray-500 text-sm mt-1">Earnings will appear here after profitable games</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-white text-sm">
              <thead>
                <tr className="border-b border-purple-500/30">
                  <th className="text-left p-3 text-purple-300">Date</th>
                  <th className="text-right p-3 text-purple-300">Game ID</th>
                  <th className="text-right p-3 text-purple-300">Shown Profit</th>
                  <th className="text-right p-3 text-purple-300">Commission</th>
                  <th className="text-right p-3 text-purple-300">Earned</th>
                </tr>
              </thead>
              <tbody>
                {earnings.map((earning, index) => (
                  <tr 
                    key={earning.id} 
                    className={`border-b border-purple-500/20 ${index % 2 === 0 ? 'bg-purple-900/10' : ''}`}
                  >
                    <td className="p-3 text-gray-300">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        {formatDate(earning.credited_at)}
                      </div>
                    </td>
                    <td className="p-3 text-right text-gray-400 font-mono text-xs">
                      {earning.game_id.substring(0, 8)}...
                    </td>
                    <td className="p-3 text-right text-blue-400 font-semibold">
                      {formatCurrency(earning.shown_profit)}
                    </td>
                    <td className="p-3 text-right text-gray-400">
                      {parseFloat(earning.commission_rate).toFixed(0)}%
                    </td>
                    <td className="p-3 text-right text-green-400 font-bold">
                      {formatCurrency(earning.earned_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}