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
        ],
    },
    { path: '/auth/signin', element: <SignIn /> },
    { path: '/auth/signup', element: <SignUp /> },
    { path: '*', element: <Navigate to="/welcome" replace /> },
])
