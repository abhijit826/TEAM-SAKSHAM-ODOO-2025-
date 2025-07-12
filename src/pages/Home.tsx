import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Clock, Vote, Eye, LogOut } from 'lucide-react';
import { QuestionCard } from '@/components/QuestionCard';
import io from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';

interface Question {
  _id: string; // Changed from id: number to _id: string to match MongoDB
  title: string;
  description: string;
  tags: string[];
  author: string;
  votes: number;
  answers: number;
  views: number;
  createdAt: string;
}

export const Home = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filter, setFilter] = useState<'all' | 'unanswered' | 'answered'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'votes' | 'views'>('newest');
  const { user, logout } = useAuth();

  useEffect(() => {
    const fetchQuestions = async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/questions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setQuestions(data);
      } else {
        console.error('Failed to fetch questions:', response.status);
      }
    };
    fetchQuestions();

    const socket = io('http://localhost:5000', { withCredentials: true });
    socket.on('connect', () => {
      if (user?._id) {
        socket.emit('join', user._id); // Use user._id from AuthContext
      }
    });

    socket.on('newQuestion', () => {
      fetchQuestions();
    });

    return () => {
      socket.off('connect');
      socket.off('newQuestion');
    };
  }, [user?._id]); // Re-run effect if user changes

  const filteredQuestions = filter === 'all'
    ? questions
    : filter === 'unanswered'
      ? questions.filter(q => q.answers === 0)
      : questions.filter(q => q.answers > 0);

  const sortedQuestions = [...filteredQuestions].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortBy === 'oldest') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else if (sortBy === 'votes') {
      return b.votes - a.votes;
    } else {
      return b.views - a.views;
    }
  });

  const filteredAndSortedQuestions = sortedQuestions;
  const totalQuestions = questions.length;
  const answeredCount = questions.filter(q => q.answers > 0).length;
  const totalVotes = questions.reduce((sum, q) => sum + q.votes, 0);
  const totalViews = questions.reduce((sum, q) => sum + q.views, 0);

  return (
    <div className="space-y-8">
      {/* Hero Section with User Info */}
      <div className="text-center space-y-4 py-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent">
          Welcome to StackIt
        </h1>
        {user && (
          <p className="text-lg text-muted-foreground">
            Logged in as {user.username} <Button variant="ghost" size="sm" onClick={logout} className="ml-2"><LogOut className="h-4 w-4" /></Button>
          </p>
        )}
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Your collaborative learning platform for asking questions, sharing knowledge, and building together.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{totalQuestions}</div>
            <div className="text-sm text-muted-foreground">Total Questions</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{answeredCount}</div>
            <div className="text-sm text-muted-foreground">Answered</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{totalVotes}</div>
            <div className="text-sm text-muted-foreground">Total Votes</div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 border-orange-200/50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{totalViews}</div>
            <div className="text-sm text-muted-foreground">Total Views</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Sorting */}
      <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Questions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
              className={filter === 'all' ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg' : 'hover:bg-blue-50 dark:hover:bg-blue-950/20 border-blue-200'}
            >
              All Questions
            </Button>
            <Button
              variant={filter === 'unanswered' ? 'default' : 'outline'}
              onClick={() => setFilter('unanswered')}
              className={filter === 'unanswered' ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg' : 'hover:bg-orange-50 dark:hover:bg-orange-950/20 border-orange-200'}
            >
              Unanswered
            </Button>
            <Button
              variant={filter === 'answered' ? 'default' : 'outline'}
              onClick={() => setFilter('answered')}
              className={filter === 'answered' ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg' : 'hover:bg-green-50 dark:hover:bg-green-950/20 border-green-200'}
            >
              Answered
            </Button>
          </div>

          {/* Sort Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant={sortBy === 'newest' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSortBy('newest')}
              className={sortBy === 'newest' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300' : ''}
            >
              <Clock className="h-4 w-4 mr-1" />
              Newest
            </Button>
            <Button
              variant={sortBy === 'oldest' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSortBy('oldest')}
              className={sortBy === 'oldest' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300' : ''}
            >
              <Clock className="h-4 w-4 mr-1" />
              Oldest
            </Button>
            <Button
              variant={sortBy === 'votes' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSortBy('votes')}
              className={sortBy === 'votes' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300' : ''}
            >
              <Vote className="h-4 w-4 mr-1" />
              Most Votes
            </Button>
            <Button
              variant={sortBy === 'views' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSortBy('views')}
              className={sortBy === 'views' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300' : ''}
            >
              <Eye className="h-4 w-4 mr-1" />
              Most Views
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredAndSortedQuestions.map((question) => (
          <Link to={`/questions/${question._id}`} key={question._id} className="block">
            <QuestionCard question={question} />
          </Link>
        ))}
      </div>
    </div>
  );
};