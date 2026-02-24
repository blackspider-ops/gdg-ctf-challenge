import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X, User, Shield, LogOut, Trophy, Play } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface MobileNavProps {
  title: string;
  showUserActions?: boolean;
}

export const MobileNav = ({ title, showUserActions = true }: MobileNavProps) => {
  const [open, setOpen] = useState(false);
  const { user, profile, signOut } = useAuth();

  const closeSheet = () => setOpen(false);

  return (
    <div className="mobile-nav">
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="Devs@PSU Logo" className="w-8 h-8" />
        <span className="font-semibold text-primary text-sm sm:text-base truncate">
          {title.split(' — ')[0] || title}
        </span>
      </div>

      {showUserActions && user && (
        <div className="flex items-center gap-2">
          {/* Desktop navigation */}
          <div className="hidden md:flex items-center gap-4">
            <Button 
              asChild
              variant="ghost" 
              size="sm" 
              className="text-primary hover:bg-primary/10"
            >
              <Link to="/me">
                <User className="w-4 h-4 mr-2" />
                {profile?.full_name || 'Profile'}
              </Link>
            </Button>
            {(profile?.role === 'admin' || profile?.role === 'owner') && (
              <Button 
                asChild
                variant="ghost" 
                size="sm" 
                className="text-accent hover:bg-accent/10"
              >
                <Link to="/admin">
                  <Shield className="w-4 h-4 mr-2" />
                  Admin
                </Link>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>

          {/* Mobile navigation */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="md:hidden p-2">
                <Menu className="w-5 h-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 bg-background/95 backdrop-blur">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between pb-4 border-b border-primary/20">
                  <div className="flex items-center gap-3">
                    <img src="/logo.png" alt="Devs@PSU Logo" className="w-6 h-6" />
                    <span className="font-semibold text-primary">Menu</span>
                  </div>
                </div>

                <nav className="flex-1 py-6 space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Navigation
                    </h3>
                    <Button 
                      asChild
                      variant="ghost" 
                      className="w-full justify-start text-left"
                      onClick={closeSheet}
                    >
                      <Link to="/">
                        <img src="/logo.png" alt="" className="w-4 h-4 mr-3" />
                        Home
                      </Link>
                    </Button>
                    <Button 
                      asChild
                      variant="ghost" 
                      className="w-full justify-start text-left"
                      onClick={closeSheet}
                    >
                      <Link to="/play">
                        <Play className="w-4 h-4 mr-3" />
                        Play Challenges
                      </Link>
                    </Button>
                    <Button 
                      asChild
                      variant="ghost" 
                      className="w-full justify-start text-left"
                      onClick={closeSheet}
                    >
                      <Link to="/leaderboard">
                        <Trophy className="w-4 h-4 mr-3" />
                        Leaderboard
                      </Link>
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Account
                    </h3>
                    <Button 
                      asChild
                      variant="ghost" 
                      className="w-full justify-start text-left"
                      onClick={closeSheet}
                    >
                      <Link to="/me">
                        <User className="w-4 h-4 mr-3" />
                        My Profile
                      </Link>
                    </Button>
                    {(profile?.role === 'admin' || profile?.role === 'owner') && (
                      <Button 
                        asChild
                        variant="ghost" 
                        className="w-full justify-start text-left text-accent"
                        onClick={closeSheet}
                      >
                        <Link to="/admin">
                          <Shield className="w-4 h-4 mr-3" />
                          Admin Panel
                        </Link>
                      </Button>
                    )}
                  </div>
                </nav>

                <div className="border-t border-primary/20 pt-4">
                  <div className="mb-4 p-3 bg-primary/10 rounded-lg">
                    <p className="text-sm font-medium">{profile?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{profile?.email}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      signOut();
                      closeSheet();
                    }}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}
    </div>
  );
};