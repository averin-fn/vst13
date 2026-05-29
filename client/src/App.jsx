import { Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from './components/PublicLayout.jsx';
import Home from './pages/Home.jsx';
import Participants from './pages/Participants.jsx';
import ParticipantDetail from './pages/ParticipantDetail.jsx';
import Events from './pages/Events.jsx';
import Feedback from './pages/Feedback.jsx';
import Login from './pages/admin/Login.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import ParticipantsAdmin from './pages/admin/ParticipantsAdmin.jsx';
import EventsAdmin from './pages/admin/EventsAdmin.jsx';
import FeedbackAdmin from './pages/admin/FeedbackAdmin.jsx';
import SettingsAdmin from './pages/admin/SettingsAdmin.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/participants" element={<Participants />} />
        <Route path="/participants/:id" element={<ParticipantDetail />} />
        <Route path="/events" element={<Events />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="*" element={<p className="notice">Страница не найдена</p>} />
      </Route>

      <Route path="/admin/login" element={<Login />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/participants" replace />} />
        <Route path="participants" element={<ParticipantsAdmin />} />
        <Route path="events" element={<EventsAdmin />} />
        <Route path="feedback" element={<FeedbackAdmin />} />
        <Route path="settings" element={<SettingsAdmin />} />
      </Route>
    </Routes>
  );
}
