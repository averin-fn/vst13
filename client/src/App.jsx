import { Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from './components/PublicLayout.jsx';
import Home from './pages/Home.jsx';
import Participants from './pages/Participants.jsx';
import ParticipantDetail from './pages/ParticipantDetail.jsx';
import Feedback from './pages/Feedback.jsx';
import Workshop from './pages/Workshop.jsx';
import Calendar from './pages/Calendar.jsx';
import Rules from './pages/Rules.jsx';
import Login from './pages/admin/Login.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import ParticipantsAdmin from './pages/admin/ParticipantsAdmin.jsx';
import EventsAdmin from './pages/admin/EventsAdmin.jsx';
import FeedbackAdmin from './pages/admin/FeedbackAdmin.jsx';
import SettingsAdmin from './pages/admin/SettingsAdmin.jsx';
import RulesAdmin from './pages/admin/RulesAdmin.jsx';
import WorkshopAdmin from './pages/admin/WorkshopAdmin.jsx';
import CabinetLogin from './pages/cabinet/Login.jsx';
import Cabinet from './pages/cabinet/Cabinet.jsx';
import CabinetProfile from './pages/cabinet/Profile.jsx';
import CabinetEvents from './pages/cabinet/Events.jsx';
import CabinetChat from './pages/cabinet/Chat.jsx';
import CabinetPassword from './pages/cabinet/Password.jsx';
import CabinetEventsManage from './pages/cabinet/EventsManage.jsx';
import CabinetActs from './pages/cabinet/Acts.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/participants" element={<Participants />} />
        <Route path="/participants/:id" element={<ParticipantDetail />} />
        <Route path="/events" element={<Navigate to="/calendar" replace />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/workshop" element={<Workshop />} />
        <Route path="/rules" element={<Navigate to="/cabinet/rules" replace />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="*" element={<p className="notice">Страница не найдена</p>} />
      </Route>

      <Route path="/cabinet/login" element={<CabinetLogin />} />
      <Route path="/cabinet" element={<Cabinet />}>
        <Route index element={<Navigate to="/cabinet/profile" replace />} />
        <Route path="profile" element={<CabinetProfile />} />
        <Route path="events" element={<CabinetEvents />} />
        <Route path="chat" element={<CabinetChat />} />
        <Route path="password" element={<CabinetPassword />} />
        <Route path="events-manage" element={<CabinetEventsManage />} />
        <Route path="acts" element={<CabinetActs />} />
        <Route path="rules" element={<Rules />} />
      </Route>

      <Route path="/admin/login" element={<Login />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/participants" replace />} />
        <Route path="participants" element={<ParticipantsAdmin />} />
        <Route path="events" element={<EventsAdmin />} />
        <Route path="feedback" element={<FeedbackAdmin />} />
        <Route path="settings" element={<SettingsAdmin />} />
        <Route path="rules" element={<RulesAdmin />} />
        <Route path="workshop" element={<WorkshopAdmin />} />
      </Route>
    </Routes>
  );
}
