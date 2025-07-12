import { useState, KeyboardEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Bell, Search, Menu, Plus, LogOut, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';

export const Header = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    if (searchQuery.trim()) {
      console.log('Searching for:', searchQuery);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              StackIt
            </Link>
            <nav className="hidden md:flex space-x-6">
              <Link to="/" className={`font-medium transition-colors ${pathname === '/' ? 'text-primary' : 'text-foreground/80 hover:text-primary'}`}>
                Questions
              </Link>
            </nav>
          </div>

          <div className="flex-1 max-w-md mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search questions..."
                className="pl-10 bg-muted/50 border-muted-foreground/20 focus:bg-background transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <ThemeToggle />

            <Button variant="ghost" size="icon" className="relative hover:bg-accent">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                3
              </span>
            </Button>

            {user ? (
              <Button variant="ghost" onClick={handleLogout} className="hover:bg-accent">
                <LogOut className="h-5 w-5" />
                <span className="ml-2 hidden md:inline">Logout ({user.username})</span>
              </Button>
            ) : (
              <Button variant="ghost" size="icon" className="hover:bg-accent">
                <User className="h-5 w-5" />
              </Button>
            )}

            <Button 
              onClick={() => navigate('/ask')} 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ask Question
            </Button>

            <Button variant="ghost" size="icon" className="md:hidden hover:bg-accent">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};