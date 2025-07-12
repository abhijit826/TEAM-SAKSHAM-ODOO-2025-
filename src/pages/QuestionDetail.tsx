import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RichTextEditor } from '@/components/RichTextEditor';
import { ArrowUp, ArrowDown, MessageSquare, Check, Eye } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { useAuth } from '../contexts/AuthContext';
import io from 'socket.io-client';

// Utility function for relative time
const toRelativeTime = (date: Date): string => {
  const diff = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (diff < 60) return `${diff} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
};

// Interfaces for type safety
interface User {
  _id: string;
  username: string;
}

interface Answer {
  _id: string;
  content: string;
  user?: User;
  upvotes: string[];
  downvotes: string[];
  accepted: boolean;
  createdAt: string;
}

interface Question {
  _id: string;
  title: string;
  description: string;
  tags: string[];
  user?: User;
  upvotes: string[];
  downvotes: string[];
  views?: number;
  answers: Answer[];
  createdAt: string;
}

export const QuestionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [question, setQuestion] = useState<Question | null>(null);
  const [answerContent, setAnswerContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const socket = useMemo(() => io('http://localhost:5000', { withCredentials: true, autoConnect: false }), []);

  useEffect(() => {
    if (!id) {
      navigate('/');
      return;
    }

    socket.connect();
    socket.on('questionUpdate', (updatedQuestion: Question) => {
      if (updatedQuestion._id === id) setQuestion(updatedQuestion);
    });

    const fetchQuestion = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/questions/${id}?userId=${user?._id || ''}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` },
        });
        if (response.ok) {
          const data: Question = await response.json();
          setQuestion(data);
        } else {
          throw new Error('Question not found');
        }
      } catch (error) {
        toast({ title: "Error", description: 'Failed to load question.', variant: "destructive" });
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestion();
    return () => {
      socket.off('questionUpdate');
      socket.disconnect();
    };
  }, [id, navigate, socket, toast, user?._id]);

  const handleVote = async (type: 'up' | 'down', targetType: 'question' | 'answer', targetId?: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: (
          <div>
            Please log in to vote.{' '}
            <button onClick={() => navigate('/login')} className="underline text-blue-600 hover:text-blue-800">
              Log In
            </button>
          </div>
        ),
        variant: "destructive"
      });
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    if (!question || !user) return;

    const target = targetType === 'question' ? question : question.answers.find((a) => a._id === targetId);
    if (!target) return;

    const hasVoted = (target.upvotes || []).includes(user._id) || (target.downvotes || []).includes(user._id);
    if (hasVoted) {
      toast({ title: "Error", description: 'You have already voted.', variant: "destructive" });
      return;
    }

    try {
      const url = targetType === 'question'
        ? `http://localhost:5000/api/questions/${id}/vote`
        : `http://localhost:5000/api/answers/${targetId}/vote`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({ vote: type }),
      });

      if (response.ok) {
        const updatedData: Question | Answer = await response.json();
        if (targetType === 'question') {
          setQuestion(updatedData as Question);
        } else {
          setQuestion({
            ...question,
            answers: question.answers.map((a) => a._id === targetId ? updatedData as Answer : a),
          });
        }
        // The server should emit the 'questionUpdate' event to all clients after a successful vote.
      } else {
        const error = await response.json();
        toast({ title: "Error", description: error.message || 'Failed to vote.', variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: 'An unexpected error occurred.', variant: "destructive" });
    }
  };

  const handleAcceptAnswer = async (answerId: string) => {
    if (!isAuthenticated || question?.user?._id !== user?._id) {
      toast({ title: "Error", description: 'Only the question owner can accept an answer.', variant: "destructive" });
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/answers/${answerId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });

      if (response.ok) {
        const updatedQuestion: Question = await response.json();
        setQuestion(updatedQuestion);
        // The server should emit the 'questionUpdate' event.
      } else {
        const error = await response.json();
        toast({ title: "Error", description: error.message || 'Failed to accept answer.', variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: 'An unexpected error occurred.', variant: "destructive" });
    }
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated || !answerContent.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`http://localhost:5000/api/answers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({ questionId: id, content: answerContent }),
      });

      if (response.ok) {
        const newAnswer: Answer = await response.json();
        setQuestion((prev) => {
          if (!prev) return null;
          return { ...prev, answers: [...prev.answers, newAnswer] };
        });
        toast({ title: "Answer Posted!", description: "Your answer has been added to the question." });
        setAnswerContent('');
      } else {
        const error = await response.json();
        toast({ title: "Error", description: error.message || 'Failed to post answer.', variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: 'An unexpected error occurred.', variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="text-center p-4">Loading...</div>;
  if (!question) return <div className="text-center p-4">Question not found.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Question */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4">
            {/* Vote buttons */}
            <div className="flex flex-col items-center space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVote('up', 'question')}
                className="p-2"
                disabled={!isAuthenticated}
              >
                <ArrowUp className="h-5 w-5" />
              </Button>
              <span className="text-lg font-semibold">{(question.upvotes || []).length - (question.downvotes || []).length}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleVote('down', 'question')}
                className="p-2"
                disabled={!isAuthenticated}
              >
                <ArrowDown className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-4">{question.title}</h1>
              
              <div className="prose max-w-none mb-4">
                <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                  {question.description || 'No description available'}
                </ReactMarkdown>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {(question.tags || []).map((tag: string) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
              
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {question.views || 0} views
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    {(question.answers || []).length} answers
                  </span>
                </div>
                <span>
                  asked by <span className="text-primary">{question.user?.username || 'Unknown'}</span>{' '}
                  {question.createdAt ? toRelativeTime(new Date(question.createdAt)) : 'Unknown time'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Answers */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          {(question.answers || []).length} Answer{(question.answers || []).length !== 1 ? 's' : ''}
        </h2>
        
        {(question.answers || []).map((answer: Answer) => (
          <Card key={answer._id} className={answer.accepted ? 'border-green-500' : ''}>
            <CardContent className="p-6">
              <div className="flex gap-4">
                {/* Vote buttons */}
                <div className="flex flex-col items-center space-y-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleVote('up', 'answer', answer._id)}
                    className="p-2"
                    disabled={!isAuthenticated}
                  >
                    <ArrowUp className="h-5 w-5" />
                  </Button>
                  <span className="text-lg font-semibold">{(answer.upvotes || []).length - (answer.downvotes || []).length}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleVote('down', 'answer', answer._id)}
                    className="p-2"
                    disabled={!isAuthenticated}
                  >
                    <ArrowDown className="h-5 w-5" />
                  </Button>
                  
                  {/* Accept answer button (only for question owner) */}
                  <Button
                    variant={answer.accepted ? "default" : "ghost"}
                    size="sm"
                    onClick={() => handleAcceptAnswer(answer._id)}
                    className="p-2"
                    disabled={!isAuthenticated || question?.user?._id !== user?._id}
                    title={answer.accepted ? "Accepted answer" : "Accept this answer"}
                  >
                    <Check className="h-5 w-5" />
                  </Button>
                </div>

                {/* Content */}
                <div className="flex-1">
                  {answer.accepted && (
                    <Badge className="mb-3 bg-green-600">
                      <Check className="h-3 w-3 mr-1" />
                      Accepted Answer
                    </Badge>
                  )}
                  
                  <div className="prose max-w-none mb-4">
                    <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                      {answer.content || 'No content available'}
                    </ReactMarkdown>
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    answered by <span className="text-primary">{answer.user?.username || 'Unknown'}</span>{' '}
                    {answer.createdAt ? toRelativeTime(new Date(answer.createdAt)) : 'Unknown time'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />

      {/* Answer Form */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Your Answer</h3>
          <form onSubmit={handleSubmitAnswer} className="space-y-4">
            <RichTextEditor
              value={answerContent}
              onChange={setAnswerContent}
              placeholder="Write your answer here..."
            />
            <Button type="submit" disabled={isSubmitting || !answerContent.trim() || !isAuthenticated}>
              {isSubmitting ? 'Posting...' : 'Post Your Answer'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};