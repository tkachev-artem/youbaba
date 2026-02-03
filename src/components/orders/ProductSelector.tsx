import { useState, useEffect } from 'react';
import { Search, Plus, Minus, Trash2 } from 'lucide-react';
import { getProducts, type Product } from '../../lib/api/products';

interface SelectedProduct {
  product: Product;
  quantity: number;
}

interface ProductSelectorProps {
  selectedProducts: SelectedProduct[];
  onProductsChange: (products: SelectedProduct[]) => void;
}

/**
 * Компонент выбора продуктов для создания заказа оператором
 */
export function ProductSelector({ selectedProducts, onProductsChange }: ProductSelectorProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);

  // Загрузка продуктов
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setIsLoading(true);
      const response = await getProducts({ available: true, limit: 100 });
      setProducts(response.data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Фильтрация продуктов по поиску
  const filteredProducts = products.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Добавить продукт
  const handleAddProduct = (product: Product) => {
    const existing = selectedProducts.find((sp) => sp.product._id === product._id);
    if (existing) {
      // Увеличить количество
      onProductsChange(
        selectedProducts.map((sp) =>
          sp.product._id === product._id ? { ...sp, quantity: sp.quantity + 1 } : sp
        )
      );
    } else {
      // Добавить новый
      onProductsChange([...selectedProducts, { product, quantity: 1 }]);
    }
    setShowSearch(false);
    setSearchQuery('');
  };

  // Изменить количество
  const handleQuantityChange = (productId: string, delta: number) => {
    onProductsChange(
      selectedProducts
        .map((sp) =>
          sp.product._id === productId ? { ...sp, quantity: sp.quantity + delta } : sp
        )
        .filter((sp) => sp.quantity > 0)
    );
  };

  // Удалить продукт
  const handleRemoveProduct = (productId: string) => {
    onProductsChange(selectedProducts.filter((sp) => sp.product._id !== productId));
  };

  return (
    <div className="product-selector">
      <div className="product-selector-header">
        <h3>Позиции заказа</h3>
        {!showSearch ? (
          <button
            type="button"
            className="product-selector-add-btn"
            onClick={() => setShowSearch(true)}
          >
            <Plus size={18} />
            Добавить товар
          </button>
        ) : null}
      </div>

      {/* Список выбранных продуктов */}
      {selectedProducts.length > 0 ? (
        <div className="product-selector-list">
          {selectedProducts.map((sp) => (
            <div key={sp.product._id} className="product-selector-item">
              <img
                src={sp.product.image.thumbnail.url}
                alt={sp.product.title}
                className="product-selector-item-image"
              />
              <div className="product-selector-item-info">
                <div className="product-selector-item-title">{sp.product.title}</div>
                <div className="product-selector-item-details">
                  {sp.product.gram} • {sp.product.price} ₽
                </div>
              </div>
              <div className="product-selector-item-controls">
                <button
                  type="button"
                  className="product-selector-qty-btn"
                  onClick={() => handleQuantityChange(sp.product._id, -1)}
                >
                  <Minus size={16} />
                </button>
                <span className="product-selector-qty">{sp.quantity}</span>
                <button
                  type="button"
                  className="product-selector-qty-btn"
                  onClick={() => handleQuantityChange(sp.product._id, 1)}
                >
                  <Plus size={16} />
                </button>
                <button
                  type="button"
                  className="product-selector-remove-btn"
                  onClick={() => handleRemoveProduct(sp.product._id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="product-selector-item-total">
                {sp.product.price * sp.quantity} ₽
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="product-selector-empty">
          <p>Добавьте товары в заказ</p>
        </div>
      )}

      {/* Поиск и добавление товаров */}
      {showSearch && (
        <div className="product-selector-search">
          <div className="product-selector-search-header">
            <div className="product-selector-search-input-wrapper">
              <Search size={18} />
              <input
                type="text"
                placeholder="Поиск товара..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
            <button
              type="button"
              className="product-selector-search-close"
              onClick={() => {
                setShowSearch(false);
                setSearchQuery('');
              }}
            >
              Закрыть
            </button>
          </div>

          <div className="product-selector-search-results">
            {isLoading ? (
              <div className="product-selector-loading">Загрузка...</div>
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <button
                  key={product._id}
                  type="button"
                  className="product-selector-search-item"
                  onClick={() => handleAddProduct(product)}
                >
                  <img
                    src={product.image.thumbnail.url}
                    alt={product.title}
                    className="product-selector-search-item-image"
                  />
                  <div className="product-selector-search-item-info">
                    <div className="product-selector-search-item-title">{product.title}</div>
                    <div className="product-selector-search-item-details">
                      {product.gram} • {product.price} ₽
                    </div>
                  </div>
                  <Plus size={20} />
                </button>
              ))
            ) : (
              <div className="product-selector-no-results">Товары не найдены</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
