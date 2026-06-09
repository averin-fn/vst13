import { useState } from 'react';
import { Link } from 'react-router-dom';
import InviteModal from '../components/InviteModal.jsx';

export default function Home() {
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <div className="home">
      <section className="hero">
        <h1 className="hero-title">О команде</h1>
        <p className="hero-motto">«Незаметно. Слаженно. До конца.»</p>
        <p className="hero-text">
          Мы — страйкбольная команда, объединённая тактикой, дисциплиной и любовью к
          игре. Проводим тренировки, участвуем в крупных полигонных сценариях и всегда
          рады новым бойцам.
        </p>
        <div className="hero-actions">
          <Link to="/participants" className="btn btn-primary">
            Состав команды
          </Link>
          <Link to="/calendar" className="btn btn-ghost">
            Ближайшие игры
          </Link>
        </div>
      </section>

      <section className="features">
        <Link to="/participants" className="feature">
          <h3>Участники</h3>
          <p>Состав команды по отрядам: командиры, бойцы и их досье.</p>
        </Link>
        <Link to="/calendar" className="feature">
          <h3>Календарь</h3>
          <p>Расписание игр и тренировок, голосование за участие.</p>
        </Link>
        <Link to="/workshop" className="feature">
          <h3>Мастерская</h3>
          <p>Ремонт и тюнинг приводов, заявки и примеры работ.</p>
        </Link>
      </section>

      <section className="cta-block">
        <h2>Хочешь в команду?</h2>
        <p>Напиши нам через форму обратной связи — расскажем, как присоединиться.</p>
        <Link to="/feedback" className="btn btn-primary">
          Связаться с нами
        </Link>
      </section>

      <section className="cta-block">
        <h2>Пригласить на игру</h2>
        <p>Сформируйте приглашение: позывной, дислокация, дата и время и ссылка.</p>
        <button type="button" className="btn btn-primary" onClick={() => setInviteOpen(true)}>
          Пригласить
        </button>
      </section>

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}
