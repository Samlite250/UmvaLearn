import { createBrowserRouter, Navigate } from 'react-router-dom'
import AppLayout from './AppLayout'
import Welcome from './pages/Welcome'
import Home from './pages/Home'
import TextToSpeech from './pages/TextToSpeech'
import SpeechToText from './pages/SpeechToText'
import Translate from './pages/Translate'
import LibraryPage from './pages/Library'
import HistoryPage from './pages/History'
import SignIn from './pages/auth/SignIn'
import SignUp from './pages/auth/SignUp'
import About from './pages/About'
import Help from './pages/Help'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import NotFound from './pages/NotFound'
import ResetPassword from './pages/auth/ResetPassword'
import AuthCallback from './pages/auth/AuthCallback'
import Admin from './pages/Admin'

export const router = createBrowserRouter([
    {
        path: '/',
        element: <Navigate to="/welcome" replace />,
    },
    {
        path: '/welcome',
        element: <Welcome />,
    },
    {
        path: '/',
        element: <AppLayout />,
        children: [
            { path: 'home', element: <Home /> },
            { path: 'tools/tts', element: <TextToSpeech /> },
            { path: 'tools/stt', element: <SpeechToText /> },
            { path: 'tools/translate', element: <Translate /> },
            { path: 'library', element: <LibraryPage /> },
            { path: 'history', element: <HistoryPage /> },
            { path: 'about', element: <About /> },
            { path: 'help', element: <Help /> },
            { path: 'privacy', element: <Privacy /> },
            { path: 'terms', element: <Terms /> },
            { path: 'admin', element: <Admin /> },
            { path: '*', element: <NotFound /> },
        ],
    },
    { path: '/auth/signin', element: <SignIn /> },
    { path: '/auth/signup', element: <SignUp /> },
    { path: '/auth/reset', element: <ResetPassword /> },
    { path: '/auth/update-password', element: <ResetPassword update /> },
    { path: '/auth/callback', element: <AuthCallback /> },
])
