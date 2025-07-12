import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RichTextEditor } from '@/components/RichTextEditor';
import { TagInput } from '@/components/TagInput';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import io from 'socket.io-client';

export const AskQuestion = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    console.log('Auth State:', { user, isAuthenticated, token: localStorage.getItem('token') });
  }, [user, isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Form Submitted:', { title, description, tags, isAuthenticated });
    if (!title.trim() || !description.trim() || tags.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields including at least one tag.",
        variant: "destructive"
      });
      return;
    }

    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: (
          <div>
            You need to be logged in to post a question.{' '}
            <Link to="/login" className="underline text-blue-600 hover:text-blue-800" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>
              Log In
            </Link>{' '}
            or{' '}
            <Link to="/signup" className="underline text-blue-600 hover:text-blue-800" onClick={(e) => { e.preventDefault(); navigate('/signup'); }}>
              Sign Up
            </Link>{' '}
            to continue. Redirecting to login in 3 seconds...
          </div>
        ),
        variant: "destructive"
      });
      setTimeout(() => navigate('/login'), 3000); // Redirect after 3 seconds if no action
      return;
    }

    setIsSubmitting(true);
    console.log('Starting Submission:', { isSubmitting });

    try {
      const response = await fetch('http://localhost:5000/api/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ title, description, tags }),
      });

      console.log('API Response Status:', response.status, await response.text());
      if (response.ok) {
        const socket = io('http://localhost:5000', { withCredentials: true });
        socket.emit('newQuestion', { message: `${user?.username} posted a new question: ${title}` });
        toast({
          title: "Question Posted!",
          description: "Your question has been successfully posted.",
        });
        navigate('/');
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || 'Failed to post question',
          variant: "destructive"
        });
        throw new Error(error.message || 'API Error');
      }
    } catch (error) {
      console.error('Submission Error:', error);
      toast({
        title: "Error",
        description: 'An unexpected error occurred.',
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
      console.log('Submission Complete, isSubmitting:', isSubmitting);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Ask a Question</h1>
        <p className="text-muted-foreground">
          Get help from the community by asking a clear, detailed question.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Title</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Be specific and imagine you're asking a question to another person"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Provide all the details someone would need to understand and answer your question..."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <TagInput
              tags={tags}
              onChange={setTags}
              placeholder="Add tags to help others find your question (e.g., react, javascript, css)"
            />
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="px-8"
          >
            {isSubmitting ? 'Posting...' : 'Post Question'}
          </Button>
          <Button 
            type="button" 
            variant="outline"
            onClick={() => navigate('/')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};