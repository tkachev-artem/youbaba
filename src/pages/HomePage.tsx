import { useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import { ProductCatalog } from '../components/ProductCatalog';
import { HeroSlider } from '../components/HeroSlider';
import { CategoryTabs } from '../components/CategoryTabs';
import { productCategories } from '../data/products';

export function HomePage() {
  const categoryTitles = useMemo(
    () => productCategories.map((c) => c.title.replace(/:\s*$/, '')),
    []
  );

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  return (
    <Layout>
      <div className="hero-section">
        <main className="main">
          <div className="hero-container">
            <div className="hero-top-content">
              {/* Hero slider (React-версия) */}
              <HeroSlider />

              {/* CategoryTabs для БОЛЬШИХ экранов (>768px) */}
              <div className="category-tabs-desktop">
                <CategoryTabs
                  categories={categoryTitles}
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                />
              </div>
            </div>

            {/* CategoryTabs для МАЛЕНЬКИХ экранов (≤768px) */}
            <div className="category-tabs-mobile">
              <CategoryTabs
                categories={categoryTitles}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
              />
            </div>

            <ProductCatalog selectedCategory={selectedCategory} />
          </div>
        </main>
      </div>
    </Layout>
  );
}
