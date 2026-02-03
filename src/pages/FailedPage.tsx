import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { CircleAlert, RotateCcw, Home } from 'lucide-react';

export function FailedPage() {
  return (
    <Layout>
      <div className="order-page">
        <div className="order-container">
          <div className="failed-page-card">
            <div className="failed-icon-wrapper">
              <CircleAlert size={80} color="#c62828" strokeWidth={2} />
            </div>
            
            <h1 className="failed-title">Ошибка оплаты</h1>
            
            <p className="failed-message">
              К сожалению, произошла ошибка при обработке платежа.
              Пожалуйста, попробуйте еще раз или выберите другой способ оплаты.
            </p>

            <div className="failed-buttons">
              <Link to="/order" className="failed-btn failed-btn-primary">
                <RotateCcw size={20} />
                <span>Попробовать снова</span>
              </Link>
              <Link to="/" className="failed-btn failed-btn-secondary">
                <Home size={20} />
                <span>На главную</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
