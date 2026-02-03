import { useOrderStore } from '../../store/orderStore';
import { useCartStore } from '../../store/cartStore';
import { Minus, Plus, Utensils } from 'lucide-react';

/**
 * Дополнительные поля (приборы, комментарий)
 */
export function OrderAdditionalFields() {
  const cutleryCount = useOrderStore((s) => s.cutleryCount);
  const comment = useOrderStore((s) => s.comment);
  const setCutleryCount = useOrderStore((s) => s.setCutleryCount);
  const setComment = useOrderStore((s) => s.setComment);
  const totalItems = useCartStore((s) => s.getTotalCount());

  return (
    <div className="order-section-card">
      <div className="order-section-header-static">
        <Utensils size={20} color="#4CAF50" />
        <h2 className="order-section-title">Дополнительно</h2>
      </div>

      <div className="modal-form-field">
        <label htmlFor="cutlery-count">Количество приборов</label>
        <div className="cutlery-counter">
          <button
            type="button"
            className="cutlery-btn"
            onClick={() => setCutleryCount(Math.max(0, cutleryCount - 1))}
            disabled={cutleryCount <= 0}
          >
            <Minus size={16} />
          </button>
          <span className="cutlery-count">{cutleryCount}</span>
          <button
            type="button"
            className="cutlery-btn"
            onClick={() => setCutleryCount(cutleryCount + 1)}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="modal-form-field" style={{ marginTop: '16px' }}>
        <label htmlFor="order-comment">Комментарий к заказу</label>
        <textarea
          id="order-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Дополнительные пожелания..."
          rows={3}
        />
      </div>
    </div>
  );
}
