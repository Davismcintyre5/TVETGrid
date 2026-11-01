import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import PageLoader from '@/components/ui/PageLoader';

export default function ProtectedRoute({ children, requireVerified = false }) {
  const { status, isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading || status === 'idle') {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireVerified && user && !user.emailVerified) {
    return <Navigate to="/verify" replace />;
  }

  return children;
}