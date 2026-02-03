class CartUI {
    constructor(cartManager) {
        this.cartManager = cartManager;
        this.isOpen = false;
        this.handleCheckoutClick = this.handleCheckoutClick.bind(this);
        this.init();
    }

    init() {
        this.createCartHTML();
        this.bindEvents();
        this.updateCartUI();
    }

    createCartHTML() {
        const cartHTML = `
            <div class="cart-overlay"></div>
            <div class="cart-sidebar">
                <div class="cart-header">
                    <div class="cart-title">
                        КОРЗИНА
                        <button class="close-cart" aria-label="Закрыть корзину">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <div class="cart-content">
                    <div class="cart-empty">
                        <div class="cart-empty-icon">🛒</div>
                        <p class="cart-empty-text">Ваша корзина пуста</p>
                        <button class="continue-shopping-btn">Продолжить покупки</button>
                    </div>
                    <div class="cart-items" style="display: none;"></div>
                </div>
                
                <div class="cart-footer" style="display: none;">
                    <div class="cart-totals">
                        <div class="total-row">
                            <span class="total-label">Стоимость товаров:</span>
                            <span class="total-value" id="products-total">0 ₽</span>
                        </div>
                        <div class="total-row">
                            <span class="total-label">Стоимость доставки:</span>
                            <span class="total-value" id="delivery-total">0 ₽</span>
                        </div>
                        <div class="total-row final">
                            <span class="total-label">Итого к оплате:</span>
                            <span class="total-value" id="final-total">0 ₽</span>
                        </div>
                    </div>
                    
                    <button class="checkout-btn" disabled>
                        Далее
                    </button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', cartHTML);
        
        this.overlay = document.querySelector('.cart-overlay');
        this.sidebar = document.querySelector('.cart-sidebar');
        this.cartItems = document.querySelector('.cart-items');
        this.cartEmpty = document.querySelector('.cart-empty');
        this.cartFooter = document.querySelector('.cart-footer');
        this.checkoutBtn = document.querySelector('.checkout-btn');

        const continueBtn = this.cartEmpty.querySelector('.continue-shopping-btn');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => this.close());
        }
    }

    bindEvents() {
        // Обработчики для кнопок корзины
        document.querySelectorAll('.cart-btn, .burger-btn').forEach(btn => {
            if (btn) {
                btn.addEventListener('click', (e) => {
                    if (btn.classList.contains('cart-btn') || 
                        (btn.querySelector('.burger-title') && btn.querySelector('.burger-title').textContent === 'Корзина')) {
                        e.preventDefault();
                        this.open();
                    }
                });
            }
        });

        const closeCartBtn = document.querySelector('.close-cart');
        if (closeCartBtn) {
            closeCartBtn.addEventListener('click', () => this.close());
        }
        
        if (this.overlay) {
            this.overlay.addEventListener('click', () => this.close());
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    open() {
        this.isOpen = true;
        if (this.overlay) this.overlay.classList.add('active');
        if (this.sidebar) this.sidebar.classList.add('active');
        document.body.style.overflow = 'hidden';
        this.updateCartUI();
    }

    close() {
        this.isOpen = false;
        if (this.overlay) this.overlay.classList.remove('active');
        if (this.sidebar) this.sidebar.classList.remove('active');
        document.body.style.overflow = '';
    }

    updateCartUI() {
        const cartContents = this.cartManager.getCartContents();
        const totalItems = cartContents.length;
        const productsTotal = this.cartManager.getTotalPrice();

        if (totalItems > 0 && this.cartEmpty && this.cartItems && this.cartFooter) {
            this.cartEmpty.style.display = 'none';
            this.cartItems.style.display = 'flex';
            this.cartFooter.style.display = 'block';
            
            this.renderCartItems(cartContents);
        } else if (this.cartEmpty && this.cartItems && this.cartFooter) {
            this.cartEmpty.style.display = 'block';
            this.cartItems.style.display = 'none';
            this.cartFooter.style.display = 'none';
        }

        this.updateTotals(productsTotal);
        this.updateCheckoutButton();
    }

    renderCartItems(cartContents) {
        if (!this.cartItems) return;
        
        this.cartItems.innerHTML = '';
        
        cartContents.forEach((item) => {
            const productImage = item.image || this.getProductImage(item.name);
            const escapedName = this.escapeHtml(item.name);
            
            const cartItemHTML = `
                <div class="cart-item" data-product="${escapedName}">
                    <img src="${productImage}" alt="${escapedName}" class="cart-item-image" 
                         onerror="this.src='/Images/product-images/default-product.png'">
                    <div class="cart-item-info">
                        <div class="cart-item-name">${escapedName}</div>
                        <div class="cart-item-price">${item.price} ₽</div>
                        <div class="cart-item-controls">
                            <button class="quantity-btn minus" data-product="${escapedName}" aria-label="Уменьшить количество">-</button>
                            <span class="quantity-display">${item.quantity}</span>
                            <button class="quantity-btn plus" data-product="${escapedName}" aria-label="Увеличить количество">+</button>
                            <button class="remove-item" data-product="${escapedName}" aria-label="Удалить товар">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            this.cartItems.insertAdjacentHTML('beforeend', cartItemHTML);
        });

        this.bindCartItemEvents();
    }

    // Улучшенный метод для получения изображения продукта
    getProductImage(productName) {
        const normalizedName = productName.toLowerCase().trim();
        
        const productImageMap = {
            // Салаты
            'юбаба': '/Images/product-images/product-image1.png',
            'древесные грибы': '/Images/product-images/product-image2.png',
            'чука': '/Images/product-images/product-image3.png',
            'цезарь с креветкой': '/Images/product-images/product-image4.png',
            'цезарь с курицей': '/Images/product-images/product-image5.png',
            
            // Лапша/рис
            'лапша с уткой': '/Images/product-images/product-image6.png',
            'лапша карри': '/Images/product-images/product-image7.png',
            'удон курица': '/Images/product-images/product-image8.png',
            'удон морики': '/Images/product-images/product-image9.png',
            'рис курица': '/Images/product-images/product-image10.png',
            'рис морики': '/Images/product-images/product-image11.png',
            
            // Закуски
            'мидии спайси': '/Images/product-images/product-image12.png',
            'мидии сырные': '/Images/product-images/product-image13.png',
            'креветки васаби': '/Images/product-images/product-image14.png',
            'сырные палочки': '/Images/product-images/product-image15.png',
            'картофельные дольки': '/Images/product-images/product-image16.png',
            'картофель фри': '/Images/product-images/product-image17.png',
            
            // Поке
            'поке креветка': '/Images/product-images/product-image18.png',
            'поке лосось': '/Images/product-images/product-image19.png',
            
            // Роллы холодные
            'сладкий с бананом': '/Images/product-images/product-image58.png',
            'филадельфия': '/Images/product-images/product-image20.png',
            'сигма': '/Images/product-images/product-image21.png',
            'филадельфия с манго': '/Images/product-images/product-image22.png',
            'эби с манго': '/Images/product-images/product-image23.png',
            'калифорния с лососем': '/Images/product-images/product-image24.png',
            'калифорния с крабом': '/Images/product-images/product-image25.png',
            'калифорния с угрем': '/Images/product-images/product-image26.png',
            'калифорния с креветкой': '/Images/product-images/product-image27.png',
            'маки лосось': '/Images/product-images/product-image28.png',
            'моки угорь': '/Images/product-images/product-image29.png',
            'моки креветка': '/Images/product-images/product-image36.png',
            'ролл огурец': '/Images/product-images/product-image30.png',
            'овощной': '/Images/product-images/product-image31.png',
            'кидо': '/Images/product-images/product-image32.png',
            'миюки': '/Images/product-images/product-image33.png',
            'канада': '/Images/product-images/product-image34.png',
            'бонито': '/Images/product-images/product-image35.png',
            
            // Роллы жаренные
            'темпура с угрем': '/Images/product-images/product-image37.png',
            'темпура с креветкой': '/Images/product-images/product-image38.png',
            'цезарь': '/Images/product-images/product-image39.png',
            'темпура с лососем': '/Images/product-images/product-image40.png',
            'мураками': '/Images/product-images/product-image41.png',
            
            // Роллы запеченые
            'запеченые с креветкой и крабом': '/Images/product-images/product-image42.png',
            'запеченый с курицей': '/Images/product-images/product-image43.png',
            'запеченый с угрем': '/Images/product-images/product-image44.png',
            'запеченый с крабом': '/Images/product-images/product-image45.png',
            'запеченый с лососем': '/Images/product-images/product-image46.png',
            'домбай': '/Images/product-images/product-image47.png',
            
            // Десерты
            'моти манго-маракуя': '/Images/product-images/product-image49.png',
            'моти малина': '/Images/product-images/product-image50.png',
            'моти смородина': '/Images/product-images/product-image51.png',
            
            // Соусы
            'сырный соус': '/Images/product-images/product-image55.png',
            'кетчуп': '/Images/product-images/product-image56.png',
            'спайси соус': '/Images/product-images/product-image57.png',
            'васаби': '/Images/product-images/product-image59.png',
            'имбирь': '/Images/product-images/product-image60.png',
            'соевый соус': '/Images/product-images/product-image62.png',
            'тереяки': '/Images/product-images/product-image62.png',
            'ореховый': '/Images/product-images/product-image61.png',
            
            // Супы
            'кимчи с уткой': '/Images/product-images/product-image52.png',
            'том ям морики': '/Images/product-images/product-image53.png',
            'том ям с курицей': '/Images/product-images/product-image54.png',
            
            // Подарки
            'ролл запечённый с лососем': '/Images/product-images/product-image46.png'
        };

        // Сначала ищем точное совпадение
        for (const [key, value] of Object.entries(productImageMap)) {
            if (normalizedName === key.toLowerCase()) {
                return value;
            }
        }

        // Ищем частичное совпадение
        for (const [key, value] of Object.entries(productImageMap)) {
            if (normalizedName.includes(key.toLowerCase()) || key.toLowerCase().includes(normalizedName)) {
                return value;
            }
        }

        // Ищем совпадение по ключевым словам
        const keywords = {
            'орех': '/Images/product-images/product-image61.png',
            'соус': '/Images/product-images/product-image55.png', // сырный соус как fallback для соусов
            'салат': '/Images/product-images/product-image1.png',
            'ролл': '/Images/product-images/product-image20.png',
            'суп': '/Images/product-images/product-image52.png',
            'десерт': '/Images/product-images/product-image49.png',
            'лапша': '/Images/product-images/product-image6.png',
            'рис': '/Images/product-images/product-image10.png'
        };

        for (const [keyword, image] of Object.entries(keywords)) {
            if (normalizedName.includes(keyword)) {
                return image;
            }
        }

        // Возвращаем изображение по умолчанию
        return '/Images/product-images/default-product.png';
    }

    bindCartItemEvents() {
        // Обработчики для кнопок увеличения количества
        document.querySelectorAll('.quantity-btn.plus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productName = e.target.closest('.quantity-btn').dataset.product;
                const currentItem = this.cartManager.cart.get(productName);
                if (currentItem) {
                    this.showLoadingAnimation();
                    setTimeout(() => {
                        this.cartManager.updateQuantity(productName, currentItem.quantity + 1);
                        this.updateCartUI();
                    }, 500);
                }
            });
        });

        // Обработчики для кнопок уменьшения количества
        document.querySelectorAll('.quantity-btn.minus').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productName = e.target.closest('.quantity-btn').dataset.product;
                const currentItem = this.cartManager.cart.get(productName);
                if (currentItem && currentItem.quantity > 1) {
                    this.showLoadingAnimation();
                    setTimeout(() => {
                        this.cartManager.updateQuantity(productName, currentItem.quantity - 1);
                        this.updateCartUI();
                    }, 500);
                }
            });
        });

        // Обработчики для кнопок удаления
        document.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productName = e.target.closest('.remove-item').dataset.product;
                const cartItem = e.target.closest('.cart-item');
                
                if (cartItem) {
                    cartItem.classList.add('removing');
                    this.showLoadingAnimation();
                    setTimeout(() => {
                        this.cartManager.removeFromCart(productName);
                        this.updateCartUI();
                    }, 500);
                }
            });
        });
    }

    showLoadingAnimation() {
        const priceElements = [
            document.getElementById('products-total'),
            document.getElementById('delivery-total'), 
            document.getElementById('final-total')
        ];

        priceElements.forEach(element => {
            if (element) {
                const currentValue = element.textContent;
                element.innerHTML = `<span class="price-loading">${currentValue}</span>`;

                const loadingElement = element.querySelector('.price-loading');
                if (loadingElement) {
                    loadingElement.classList.add('loading');
                }
            }
        });
    }

    updateTotals(productsTotal) {
        const deliveryCost = 0;
        const finalTotal = productsTotal + deliveryCost;

        this.updatePriceWithAnimation('products-total', productsTotal);
        this.updatePriceWithAnimation('delivery-total', deliveryCost);
        this.updatePriceWithAnimation('final-total', finalTotal);
    }

    updatePriceWithAnimation(elementId, value) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const loadingElement = element.querySelector('.price-loading');
        if (loadingElement) {
            loadingElement.classList.remove('loading');
        }

        element.textContent = `${value} ₽`;

        element.classList.add('price-updated');
        setTimeout(() => {
            element.classList.remove('price-updated');
        }, 300);
    }

    updateCheckoutButton() {
        if (!this.checkoutBtn) return;
        
        const cartContents = this.cartManager.getCartContents();
        
        if (cartContents.length > 0) {
            this.checkoutBtn.disabled = false;
            this.checkoutBtn.textContent = 'Далее';
        } else {
            this.checkoutBtn.disabled = true;
            this.checkoutBtn.textContent = 'Далее';
        }

        // Обработчик клика
        this.checkoutBtn.removeEventListener('click', this.handleCheckoutClick);
        this.checkoutBtn.addEventListener('click', this.handleCheckoutClick);
    }

    handleCheckoutClick(e) {
        e.preventDefault();
        e.stopPropagation();
        this.proceedToCheckout();
    }

    proceedToCheckout() {
        const cartContents = this.cartManager.getCartContents();
        if (cartContents.length === 0) {
            alert('Корзина пуста! Добавьте товары перед оформлением заказа.');
            return;
        }

        // Временно отключаем кнопку только на время перехода
        if (this.checkoutBtn) {
            const originalText = this.checkoutBtn.textContent;
            this.checkoutBtn.textContent = 'Переход...';
            this.checkoutBtn.disabled = true;
            
            // Через 1 секунду восстанавливаем кнопку (на случай, если переход не произошел)
            setTimeout(() => {
                this.checkoutBtn.textContent = originalText;
                this.checkoutBtn.disabled = false;
            }, 1000);
        }

        this.saveCheckoutData();

        // Мгновенный переход без задержки
        console.log('🔄 Перенаправление на страницу заказа...');
        window.location.href = 'order.html';
    }

    saveCheckoutData() {
        try {
            const checkoutData = {
                cart: this.cartManager.getCartContents(),
                total: this.cartManager.getTotalPrice(),
                finalTotal: this.cartManager.getTotalPrice(),
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('checkoutData', JSON.stringify(checkoutData));
        } catch (error) {
            console.error('Ошибка сохранения данных заказа:', error);
        }
    }

    addItemToCart(productName, price) {
        this.updateCartUI();

        if (this.cartManager.getTotalItems() === 1 && !this.isOpen) {
            setTimeout(() => this.open(), 300);
        }
    }

    removeItemFromCart(productName) {
        this.updateCartUI();
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Стили для анимаций
const cartUIStyles = `
.price-loading.loading {
    display: inline-block;
    border-radius: 4px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: loading-shimmer 1.2s infinite;
    color: transparent !important;
}

.price-updated {
    animation: price-update 0.3s ease-out;
}

@keyframes loading-shimmer {
    0% {
        background-position: -200px 0;
    }
    100% {
        background-position: 200px 0;
    }
}

@keyframes price-update {
    0% {
        opacity: 0.5;
        transform: scale(0.95);
    }
    100% {
        opacity: 1;
        transform: scale(1);
    }
}

.cart-item.removing {
    animation: cartItemRemove 0.3s ease forwards;
}

@keyframes cartItemRemove {
    0% {
        opacity: 1;
        transform: translateX(0);
    }
    100% {
        opacity: 0;
        transform: translateX(100%);
    }
}

.cart-item-image {
    width: 60px;
    height: 60px;
    object-fit: cover;
    border-radius: 8px;
    background-color: #f5f5f5;
}
`;

// Добавляем стили в документ
if (!document.querySelector('#cart-ui-styles')) {
    const styleElement = document.createElement('style');
    styleElement.id = 'cart-ui-styles';
    styleElement.textContent = cartUIStyles;
    document.head.appendChild(styleElement);
}

// Инициализация CartUI после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    const initCartUI = () => {
        if (window.cartManager) {
            window.cartUI = new CartUI(window.cartManager);
            console.log('🛒 CartUI инициализирован');
            return true;
        }
        return false;
    };

    // Пробуем инициализировать сразу
    if (!initCartUI()) {
        // Если cartManager еще не готов, ждем его
        const checkCartManager = setInterval(() => {
            if (initCartUI()) {
                clearInterval(checkCartManager);
            }
        }, 100);

        // Останавливаем проверку через 5 секунд
        setTimeout(() => {
            clearInterval(checkCartManager);
            if (!window.cartUI) {
                console.warn('⚠️ CartManager не найден, CartUI не инициализирован');
            }
        }, 5000);
    }
});

// Экспорт класса для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CartUI;
}