import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Unauthorized() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#0a0a0a] via-purple-900/20 to-red-900/20 p-4">
      <Card className="w-full max-w-md mx-4 bg-black/50 border-gold/30 backdrop-blur-sm">
        <CardContent className="pt-6 text-center">
          <div className="flex flex-col items-center mb-4">
            <AlertTriangle className="h-12 w-12 text-red-500 mb-2" />
            <h1 className="text-2xl font-bold text-gold mb-2">Access Denied</h1>
          </div>

          <p className="mt-4 text-white/80">
            You don't have permission to access this resource.
          </p>
          
          <div className="mt-6 space-y-3">
            <Link to="/">
              <Button className="w-full bg-gradient-to-r from-gold to-yellow-600 text-black hover:from-gold-light hover:to-yellow-500">
                Return to Home
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" className="w-full border-gold/30 text-gold hover:bg-gold/10">
                Sign In
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}