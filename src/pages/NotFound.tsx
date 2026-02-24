import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, AlertTriangle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="container mx-auto px-4">
        <Card className="card-cyber max-w-md mx-auto text-center">
          <CardHeader>
            <div className="flex items-center justify-center gap-2 mb-4">
              <img src="/logo.png" alt="Devs@PSU Logo" className="w-12 h-12" />
            </div>
            <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-accent" />
            </div>
            <CardTitle className="text-4xl font-bold text-gradient-cyber mb-2">404</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xl text-muted-foreground">
              Oops! Page not found
            </p>
            <p className="text-sm text-muted-foreground">
              The page you're looking for doesn't exist or has been moved.
            </p>
            <Button asChild className="btn-neon">
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Return to Home
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotFound;
