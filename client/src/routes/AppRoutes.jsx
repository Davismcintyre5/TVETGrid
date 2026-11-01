import { lazy, Suspense } from 'react';
import { Navigate, useRoutes } from 'react-router-dom';

import PublicLayout from '@/components/layout/PublicLayout';
import AuthLayout from '@/components/layout/AuthLayout';
import AppLayout from '@/components/layout/AppLayout';
import JoinLayout from '@/components/layout/JoinLayout';
import ProtectedRoute from './ProtectedRoute';

import Home from '@/pages/public/Home';
import Courses from '@/pages/public/Courses';
import Papers from '@/pages/public/Papers';
import Notes from '@/pages/public/Notes';
import About from '@/pages/public/About';
import Help from '@/pages/public/Help';
import FAQ from '@/pages/public/FAQ';
import LegalPage from '@/pages/public/LegalPage';

import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import VerifyEmail from '@/pages/auth/VerifyEmail';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import ResetPassword from '@/pages/auth/ResetPassword';
import NotFound from '@/pages/auth/NotFound';

import Dashboard from '@/pages/app/Dashboard';
import ChooseCourse from '@/pages/app/ChooseCourse';
import Profile from '@/pages/app/Profile';
import AppCourses from '@/pages/app/Courses';
import AppPapers from '@/pages/app/Papers';
import AppNotes from '@/pages/app/Notes';
import Bookmarks from '@/pages/app/Bookmarks';
import Attempts from '@/pages/app/Attempts';
import AttemptDetail from '@/pages/app/AttemptDetail';
import Progress from '@/pages/app/Progress';

import Meetings from '@/pages/meetings/Meetings';
import CreateMeeting from '@/pages/meetings/CreateMeeting';
import MeetingRoom from '@/pages/meetings/MeetingRoom';
import JoinMeeting from '@/pages/meetings/JoinMeeting';
import MeetingInvites from '@/pages/meetings/MeetingInvites';
import MyInvites from '@/pages/meetings/MyInvites';

const PageLoader = lazy(() => import('@/components/ui/PageLoader'));

const wrap = (el) => <Suspense fallback={<PageLoader />}>{el}</Suspense>;
const withAuth = (el) => <ProtectedRoute>{el}</ProtectedRoute>;

export default function AppRoutes() {
  return useRoutes([
    {
      element: <PublicLayout />,
      children: [
        { path: '/', element: <Home /> },
        { path: '/courses', element: <Courses /> },
        { path: '/papers', element: <Papers /> },
        { path: '/notes', element: <Notes /> },
        { path: '/about', element: <About /> },
        { path: '/help', element: <Help /> },
        { path: '/faq', element: <FAQ /> },
        { path: '/legal/:slug', element: <LegalPage /> },
        { path: '*', element: <NotFound /> },
      ],
    },

    {
      element: <AuthLayout />,
      children: [
        { path: '/login', element: <Login /> },
        { path: '/register', element: <Register /> },
        { path: '/verify', element: <VerifyEmail /> },
        { path: '/forgot-password', element: <ForgotPassword /> },
        { path: '/reset', element: <ResetPassword /> },
      ],
    },

    {
      path: '/join/:token',
      element: (
        <JoinLayout>
          <JoinMeeting />
        </JoinLayout>
      ),
    },

    {
      path: '/guest-meeting/:id',
      element: (
        <JoinLayout>
          <MeetingRoom />
        </JoinLayout>
      ),
    },

    {
      element: withAuth(<AppLayout />),
      children: [
        { path: '/app', element: <Dashboard /> },
        { path: '/app/choose-course', element: <ChooseCourse /> },
        { path: '/app/profile', element: <Profile /> },
        { path: '/app/courses', element: <AppCourses /> },
        { path: '/app/papers', element: <AppPapers /> },
        { path: '/app/notes', element: <AppNotes /> },
        { path: '/app/bookmarks', element: <Bookmarks /> },
        { path: '/app/attempts', element: <Attempts /> },
        { path: '/app/attempts/:id', element: <AttemptDetail /> },
        { path: '/app/progress', element: <Progress /> },

        { path: '/meetings', element: <Meetings /> },
        { path: '/meetings/create', element: <CreateMeeting /> },
        { path: '/meetings/invited-to', element: <MyInvites /> },
        { path: '/meetings/:id/invites', element: <MeetingInvites /> },
        { path: '/meetings/:id', element: <MeetingRoom /> },

        { path: '/ai', element: <ComingSoonPage /> },
      ],
    },

    { path: '/404', element: <NotFound /> },
    { path: '*', element: <Navigate to="/404" replace /> },
  ]);
}

function ComingSoonPage() {
  return (
    <div className="max-w-md mx-auto py-20 text-center">
      <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">
        AI Tutor
      </h1>
      <p className="text-sm text-[var(--text-secondary)]">
        Coming soon — chat with the AI tutor about any TVET topic.
      </p>
    </div>
  );
}