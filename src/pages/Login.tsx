import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (response.ok) {
        const { token, user } = await response.json();
        login(user, token);
        toast({ title: "Logged In!", description: "Successfully logged in." });
        navigate('/');
      } else {
        const error = await response.json();
        toast({ title: "Error", description: error.message || 'Invalid credentials', variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: 'An unexpected error occurred.', variant: "destructive" });
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <Card>
        <CardHeader>
          <CardTitle>Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>
            <Button type="submit" className="w-full">Login</Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Not have an account?{' '}
            <Link to="/signup" className="underline text-blue-600 hover:text-blue-800" onClick={(e) => { e.preventDefault(); navigate('/signup'); }}>
              First sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};