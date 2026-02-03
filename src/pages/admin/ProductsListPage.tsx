import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProductsStore } from '../../store/productsStore';
import { useAuthStore } from '../../store/authStore';
import { deleteProduct, toggleProductAvailability } from '../../lib/api/admin';
import { Plus, Edit, Trash2, Eye, EyeOff, Package } from 'lucide-react';
import { CustomSelect } from '../../components/admin/CustomSelect';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import '../../styles/admin.css';

export function ProductsListPage() {
  const { products, isLoading, error, fetchProducts } = useProductsStore();
  const { token } = useAuthStore();
  const [filter, setFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    productId: string;
    productTitle: string;
  }>({
    isOpen: false,
    productId: '',
    productTitle: '',
  });

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDeleteClick = (id: string, title: string) => {
    setConfirmDialog({
      isOpen: true,
      productId: id,
      productTitle: title,
    });
  };

  const handleDeleteConfirm = async () => {
    const { productId } = confirmDialog;
    if (!token) return;
    
    setConfirmDialog({ isOpen: false, productId: '', productTitle: '' });
    
    setActionLoading(productId);
    try {
      await deleteProduct(productId, token);
      await fetchProducts();
    } catch (err) {
      alert(`Ошибка удаления: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteCancel = () => {
    setConfirmDialog({ isOpen: false, productId: '', productTitle: '' });
  };

  const handleToggleAvailability = async (id: string) => {
    if (!token) return;

    setActionLoading(id);
    try {
      await toggleProductAvailability(id, token);
      await fetchProducts();
    } catch (err) {
      alert(`Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredProducts = filter === 'all' 
    ? products 
    : products.filter(p => p.category === filter);

  const categories = Array.from(new Set(products.map(p => p.category)));

  if (isLoading && products.length === 0) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner"></div>
        <p className="admin-loading-text">Загрузка товаров...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-loading">
        <div className="admin-alert admin-alert-error" style={{ maxWidth: '500px', margin: '0 auto 20px' }}>
          Ошибка: {error}
        </div>
        <button
          onClick={() => fetchProducts()}
          className="admin-btn admin-btn-primary"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Header actions */}
      <div className="admin-flex-between">
        {/* Filter */}
        <div style={{ maxWidth: '300px', width: '100%' }}>
          <CustomSelect
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: `Все категории (${products.length})`, icon: <Package size={18} /> },
              ...categories.map(cat => ({
                value: cat,
                label: `${cat} (${products.filter(p => p.category === cat).length})`,
              }))
            ]}
            placeholder="Выберите категорию"
          />
        </div>

        {/* Add button */}
        <Link
          to="/admin/products/new"
          className="admin-btn admin-btn-primary"
        >
          <Plus size={18} />
          Добавить товар
        </Link>
      </div>

      {/* Products table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Изображение</th>
              <th>Название</th>
              <th>Категория</th>
              <th>Цена</th>
              <th style={{ textAlign: 'center' }}>Статус</th>
              <th style={{ textAlign: 'center' }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                  Товары не найдены
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => (
                <tr key={product.id} style={{ 
                  borderLeft: product.isFeatured ? '4px solid #B43F20' : 'none',
                  backgroundColor: product.isFeatured ? 'rgba(180, 63, 32, 0.04)' : 'transparent'
                }}>
                  <td>
                    <img
                      src={product.image.thumbnail.url}
                      alt={product.title}
                      className="admin-product-img"
                    />
                  </td>
                  <td>
                    <div style={{ fontWeight: '700', color: '#000', marginBottom: '4px' }}>
                      {product.title}
                      {product.isFeatured && (
                        <span style={{
                          marginLeft: '8px',
                          fontSize: '11px',
                          fontWeight: '700',
                          color: '#B43F20',
                          backgroundColor: 'rgba(180, 63, 32, 0.12)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                        }}>
                          Популярный
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '13px', color: '#888' }}>
                      {product.gram}
                    </div>
                  </td>
                  <td style={{ color: '#333', fontSize: '14px' }}>
                    {product.category}
                  </td>
                  <td style={{ fontWeight: '700', color: '#000', fontSize: '15px' }}>
                    {product.price} ₽
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      onClick={() => handleToggleAvailability(product.id)}
                      disabled={actionLoading === product.id}
                      className={`admin-status-badge ${product.isAvailable ? 'available' : 'unavailable'}`}
                    >
                      {product.isAvailable ? <Eye size={14} /> : <EyeOff size={14} />}
                      {product.isAvailable ? 'Доступен' : 'Скрыт'}
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <Link
                        to={`/admin/products/${product.id}/edit`}
                        className="admin-btn-icon edit"
                      >
                        <Edit size={16} />
                      </Link>
                      <button
                        onClick={() => handleDeleteClick(product.id, product.title)}
                        disabled={actionLoading === product.id}
                        className="admin-btn-icon delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Удаление товара"
        message={`Вы уверены, что хотите удалить товар "${confirmDialog.productTitle}"? Это действие нельзя отменить.`}
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        type="danger"
      />
    </>
  );
}
