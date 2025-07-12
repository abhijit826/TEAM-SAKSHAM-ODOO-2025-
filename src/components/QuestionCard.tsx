import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Vote, MessageSquare, Eye, User, Clock } from 'lucide-react';

interface Question {
  _id: string;
  title: string;
  tags: string[];
  author: string;
  votes: number;
  answers: number;
  views: number;
  createdAt: string;
}

const toRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const diff = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
};

export const QuestionCard = ({ question }: { question: Question }) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="text-lg">{question.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {question.tags.map(tag => (
            <Badge key={tag} variant="secondary">{tag}</Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><Vote className="h-4 w-4" /> {question.votes} votes</span>
          <span className="flex items-center gap-1"><MessageSquare className="h-4 w-4" /> {question.answers} answers</span>
          <span className="flex items-center gap-1"><Eye className="h-4 w-4" /> {question.views} views</span>
        </div>
        <div className="flex items-center gap-1">
            <User className="h-4 w-4" />
            <span>{question.author}</span>
            <Clock className="h-4 w-4 ml-2" />
            <span>asked {toRelativeTime(question.createdAt)}</span>
        </div>
      </CardFooter>
    </Card>
  );
};