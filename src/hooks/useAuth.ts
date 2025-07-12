import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useToast } from './use-toast';

const socket = io('http://localhost:5000');

export const useAuth = () => {
  const [notifications, setNotifications] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      socket.emit('join', localStorage.getItem('userId')); // Set userId after login

      socket.on('notification', (notification: { message: string }) => {
        setNotifications((prev) => [notification, ...prev]);
        toast({ description: notification.message, duration: 5000 });
      });

      socket.on('connect_error', () => {
        toast({ description: 'Connection to server failed', variant: 'destructive' });
      });
    }

    return () => {
      socket.off('notification');
      socket.off('connect_error');
    };
  }, [toast]);

  return { notifications };
};