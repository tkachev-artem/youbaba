import { useEffect } from 'react';
import { useProductsStore } from '../store/productsStore';
import { ProductCard } from './ProductCard';
import { Info } from 'lucide-react';

export function ProductCatalog({
  selectedCategory,
}: {
  selectedCategory?: string | null;
}) {
  const { groupedProducts, isLoading, error, fetchProducts, setSelectedCategory, clearError, getFeaturedProducts, checkForUpdates } = useProductsStore();

  // Загружаем товары при монтировании компонента
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Периодически проверяем обновления товаров (каждые 5 минут)
  useEffect(() => {
    const checkUpdatesInterval = setInterval(async () => {
      const hasUpdates = await checkForUpdates();
      if (hasUpdates) {
        console.log('✅ Товары обновлены');
      }
    }, 5 * 60 * 1000); // 5 минут

    return () => clearInterval(checkUpdatesInterval);
  }, [checkForUpdates]);

  // Обновляем выбранную категорию при изменении
  useEffect(() => {
    const normalizedSelected = selectedCategory?.trim().replace(/:\s*$/, '') || null;
    setSelectedCategory(normalizedSelected);
  }, [selectedCategory, setSelectedCategory]);

  // Показываем загрузку
  if (isLoading && groupedProducts.length === 0) {
    return (
      <div className="product-container">
        <div className="product-wrapper">
          <div style={{ textAlign: 'center', padding: '40px', fontSize: '18px' }}>
            <p>Загрузка товаров...</p>
          </div>
        </div>
      </div>
    );
  }

  // Показываем ошибку
  if (error) {
    return (
      <div className="product-container">
        <div className="product-wrapper">
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: '#c62828', marginBottom: '20px' }}>
              Ошибка загрузки: {error}
            </p>
            <button
              onClick={() => {
                clearError();
                fetchProducts();
              }}
              style={{
                padding: '10px 20px',
                backgroundColor: '#B43F20',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              Попробовать снова
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Получаем популярные товары
  const featuredProducts = getFeaturedProducts();
  
  // Показываем товары
  return (
    <div className="product-container">
      <div className="product-wrapper">
        <div className="product-categories-container">
          {groupedProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', fontSize: '18px' }}>
              <p>Товары не найдены</p>
            </div>
          ) : (
            <>
              {/* Секция "Популярные блюда" - показывается только когда selectedCategory === null */}
              {selectedCategory === null && featuredProducts.length > 0 && (
                <div>
                  <h1 className="product-wrapper-title">Популярные блюда:</h1>
                  <div className="product-panel-container">
                    {featuredProducts.map((p) => (
                      <ProductCard key={p.id} product={p} />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Обычные категории */}
              {groupedProducts.map((cat) => {
                // Проверяем, является ли категория роллами
                const isRollCategory = cat.title.toLowerCase().includes('ролл');
                
                return (
                  <div key={cat.title}>
                    <h1 className="product-wrapper-title">{cat.title}:</h1>
                    
                    {/* Инфо-блок только для категорий роллов */}
                    {isRollCategory && (
                      <div className="category-info-banner">
                        <div className="category-info-icon">
                          <Info size={18} />
                        </div>
                        <p className="category-info-text">
                          К каждому роллу в комплект входят: соевый соус, имбирь, васаби
                        </p>
                      </div>
                    )}
                    
                    <div className="product-panel-container">
                      {cat.items.map((p) => (
                        <ProductCard key={p.id} product={p} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
