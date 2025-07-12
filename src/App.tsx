import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeProvider';
import { AuthProvider } from './contexts/AuthContext';
import { AskQuestion } from './pages/AskQuestion';
import { Home } from './pages/Home';
import { QuestionDetail } from './pages/QuestionDetail';
import NotFound from './pages/NotFound';
import { Signup } from './pages/Signup';
import { Login } from './pages/Login';
import { Layout } from './components/Layout';
import { Toaster } from 'sonner';

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/questions/:id" element={<QuestionDetail />} />
              <Route path="/ask" element={<AskQuestion />} />
            </Route>
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster richColors />
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;