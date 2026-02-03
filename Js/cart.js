class CartManager {
    constructor() {
        this.cart = new Map();
        this.numberElement = document.querySelector('.number');
        this.mobileNumberElement = document.querySelector('#mobile-bg .number');
        this.restaurantAddress = "Эстонская 49А, Ростов-на-Дону";
        this.baseDeliveryCost = 100;
        this.costPerKm = 100;
        this.init();
    }

    init() {
        this.loadFromLocalStorage();
        this.bindEvents();
        this.updateCartDisplay();
        this.initializeButtons();
        this.setupAddressListener();
    }

    bindEvents() {
        document.addEventListener('click', (e) => {
            const button = e.target.closest('.product-btn');
            if (button) {
                this.handleProductButtonClick(button);
            }
        });
    }

    setupAddressListener() {
        const addressInput = document.querySelector('.search-input');
        if (addressInput) {
            addressInput.addEventListener('input', () => {
                if (window.cartUI && window.cartUI.isOpen) {
                    window.cartUI.updateCartUI();
                }
            });
        }
    }

    initializeButtons() {
        const buttons = document.querySelectorAll('.product-btn');
        buttons.forEach(button => {
            const productName = button.dataset.product;
            if (this.cart.has(productName)) {
                this.updateButtonToRemove(button);
            } else {
                this.updateButtonToAdd(button);
            }
        });
    }

    handleProductButtonClick(button) {
        const productName = button.dataset.product;
        const price = parseInt(button.dataset.price);

        this.animateButtonClick(button);

        if (this.cart.has(productName)) {
            this.removeFromCart(productName);
            if (window.cartUI) {
                window.cartUI.removeItemFromCart(productName);
            }
        } else {
            this.addToCart(productName, price);
            if (window.cartUI) {
                window.cartUI.addItemToCart(productName, price);
            }
        }
        
        this.saveToLocalStorage();
    }

    animateButtonClick(button) {
        const ripple = document.createElement('span');
        ripple.classList.add('ripple');
        button.appendChild(ripple);

        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = rect.width / 2 - size / 2;
        const y = rect.height / 2 - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';

        button.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            button.style.transform = 'scale(1)';
            ripple.remove();
        }, 300);
    }

    addToCart(productName, price) {
        this.cart.set(productName, {
            price: price,
            quantity: 1,
            addedAt: new Date().getTime()
        });

        this.updateButtonState(productName);
        this.updateCartDisplayWithAnimation();
        this.animateAddToCart(productName);
        this.saveToLocalStorage();
    }

    removeFromCart(productName) {
        this.cart.delete(productName);
        this.updateButtonState(productName);
        this.updateCartDisplayWithAnimation();
        this.animateRemoveFromCart(productName);
        this.saveToLocalStorage();
    }

    updateQuantity(productName, newQuantity) {
        if (newQuantity <= 0) {
            this.removeFromCart(productName);
            return;
        }

        const product = this.cart.get(productName);
        if (product) {
            product.quantity = newQuantity;
            this.cart.set(productName, product);
            this.saveToLocalStorage();
            
            if (window.cartUI && window.cartUI.isOpen) {
                window.cartUI.updateCartUI();
            }
        }
    }

    updateButtonState(productName) {
        const button = this.findButtonByProduct(productName);
        if (!button) return;

        if (this.cart.has(productName)) {
            this.animateToRemoveState(button);
        } else {
            this.animateToAddState(button);
        }
    }

    updateButtonToRemove(button) {
        button.innerHTML = `Удалить`;
        button.style.backgroundColor = '#e74c3c';
        button.style.color = 'white';
        button.classList.add('in-cart');
    }

    updateButtonToAdd(button) {
        const price = button.dataset.price;
        button.innerHTML = `${price} ₽`;
        button.style.backgroundColor = '';
        button.style.color = '';
        button.classList.remove('in-cart');
    }

    animateToRemoveState(button) {
        button.style.overflow = 'hidden';

        button.style.opacity = '0.6';
        button.style.transform = 'scale(0.9) rotate(-2deg)';
        
        setTimeout(() => {
            this.updateButtonToRemove(button);

            button.style.opacity = '0';
            button.style.transform = 'scale(0.8) rotate(2deg)';
            
            setTimeout(() => {
                button.style.opacity = '1';
                button.style.transform = 'scale(1) rotate(0deg)';
                this.animateSuccess(button, 'added');
            }, 100);
        }, 200);
    }

    animateToAddState(button) {
        button.style.overflow = 'hidden';

        button.style.opacity = '0.6';
        button.style.transform = 'scale(0.9) rotate(2deg)';
        
        setTimeout(() => {
            this.updateButtonToAdd(button);

            button.style.opacity = '0';
            button.style.transform = 'scale(0.8) rotate(-2deg)';
            
            setTimeout(() => {
                button.style.opacity = '1';
                button.style.transform = 'scale(1) rotate(0deg)';
            }, 100);
        }, 200);
    }

    animateAddToCart(productName) {
        const button = this.findButtonByProduct(productName);
        if (!button) return;

        const flyElement = document.createElement('div');
        flyElement.className = 'fly-to-cart';
        flyElement.textContent = '+1';
        flyElement.style.cssText = `
            position: fixed;
            background: #27ae60;
            color: white;
            padding: 8px 12px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 14px;
            z-index: 10000;
            pointer-events: none;
            transition: all 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        `;

        const rect = button.getBoundingClientRect();
        flyElement.style.left = rect.left + rect.width / 2 + 'px';
        flyElement.style.top = rect.top + 'px';

        document.body.appendChild(flyElement);

        setTimeout(() => {
            const cartRect = document.querySelector('.number-container')?.getBoundingClientRect();
            if (cartRect) {
                flyElement.style.left = cartRect.left + cartRect.width / 2 + 'px';
                flyElement.style.top = cartRect.top + cartRect.height / 2 + 'px';
                flyElement.style.transform = 'scale(0.3)';
                flyElement.style.opacity = '0';
            }
        }, 50);

        setTimeout(() => {
            flyElement.remove();
        }, 1000);
    }

    animateRemoveFromCart(productName) {
        const button = this.findButtonByProduct(productName);
        if (!button) return;

        const removeElement = document.createElement('div');
        removeElement.className = 'remove-from-cart';
        removeElement.textContent = '-1';
        removeElement.style.cssText = `
            position: fixed;
            background: #e74c3c;
            color: white;
            padding: 8px 12px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 14px;
            z-index: 10000;
            pointer-events: none;
            transition: all 0.6s ease-out;
        `;

        const cartRect = document.querySelector('.number-container')?.getBoundingClientRect();
        if (cartRect) {
            removeElement.style.left = cartRect.left + cartRect.width / 2 + 'px';
            removeElement.style.top = cartRect.top + cartRect.height / 2 + 'px';
        }

        document.body.appendChild(removeElement);

        setTimeout(() => {
            removeElement.style.transform = 'translateY(-50px) scale(0.5)';
            removeElement.style.opacity = '0';
        }, 50);

        setTimeout(() => {
            removeElement.remove();
        }, 800);
    }

    animateSuccess(button, type) {
        if (type === 'added') {
            this.createConfetti(button);
        }
    }

    createConfetti(button) {
        const rect = button.getBoundingClientRect();
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'];
        
        for (let i = 0; i < 12; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.cssText = `
                position: fixed;
                width: 8px;
                height: 8px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                border-radius: 1px;
                z-index: 10000;
                pointer-events: none;
                left: ${rect.left + rect.width / 2}px;
                top: ${rect.top + rect.height / 2}px;
            `;

            document.body.appendChild(confetti);

            const angle = Math.random() * Math.PI * 2;
            const velocity = 30 + Math.random() * 30;
            const rotation = Math.random() * 720 - 360;

            confetti.animate([
                {
                    transform: `translate(0, 0) rotate(0deg)`,
                    opacity: 1
                },
                {
                    transform: `translate(${Math.cos(angle) * velocity}px, ${Math.sin(angle) * velocity}px) rotate(${rotation}deg)`,
                    opacity: 0
                }
            ], {
                duration: 1000,
                easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)'
            });

            setTimeout(() => confetti.remove(), 1000);
        }
    }

    findButtonByProduct(productName) {
        const buttons = document.querySelectorAll('.product-btn');
        return Array.from(buttons).find(btn => btn.dataset.product === productName);
    }

    updateCartDisplayWithAnimation() {
        const totalItems = this.getTotalItems();
        this.updateNumberElement(this.numberElement, totalItems);
        this.updateNumberElement(this.mobileNumberElement, totalItems);
        this.updateCounterVisibility(totalItems);
    }

    updateNumberElement(element, totalItems) {
        if (!element) return;

        const currentItems = parseInt(element.textContent);

        if (totalItems > currentItems) {
            this.animateCounterIncrease(element, totalItems);
        } else {
            this.animateCounterDecrease(element, totalItems);
        }
    }

    animateCounterIncrease(element, totalItems) {
        element.animate([
            { transform: 'scale(1)', color: '#B43F20' },
            { transform: 'scale(1.5)', color: '#27ae60' },
            { transform: 'scale(1.2)', color: '#B43F20' },
            { transform: 'scale(1)', color: '#B43F20' }
        ], {
            duration: 600,
            easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
        });

        setTimeout(() => {
            element.textContent = totalItems;
        }, 200);
    }

    animateCounterDecrease(element, totalItems) {
        element.animate([
            { transform: 'translateX(0px)' },
            { transform: 'translateX(-3px)' },
            { transform: 'translateX(3px)' },
            { transform: 'translateX(-2px)' },
            { transform: 'translateX(2px)' },
            { transform: 'translateX(0px)' }
        ], {
            duration: 400,
            easing: 'ease-in-out'
        });

        element.style.color = '#e74c3c';
        setTimeout(() => {
            element.textContent = totalItems;
            element.style.color = '#B43F20';
        }, 200);
    }

    updateCounterVisibility(totalItems) {
        const numberContainers = document.querySelectorAll('.number-container');
        
        numberContainers.forEach(container => {
            if (!container) return;

            if (totalItems > 0) {
                container.style.display = 'flex';

                container.animate([
                    { opacity: 0, transform: 'scale(0) rotate(-180deg)' },
                    { opacity: 1, transform: 'scale(1.1) rotate(10deg)' },
                    { opacity: 1, transform: 'scale(1) rotate(0deg)' }
                ], {
                    duration: 500,
                    easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
                });
            } else {
                container.animate([
                    { opacity: 1, transform: 'scale(1) rotate(0deg)' },
                    { opacity: 0, transform: 'scale(0) rotate(180deg)' }
                ], {
                    duration: 400,
                    easing: 'ease-in-out'
                });

                setTimeout(() => {
                    container.style.display = 'none';
                }, 400);
            }
        });
    }

    updateCartDisplay() {
        const totalItems = this.getTotalItems();
        
        if (this.numberElement) {
            this.numberElement.textContent = totalItems;
        }
        
        if (this.mobileNumberElement) {
            this.mobileNumberElement.textContent = totalItems;
        }
        
        const numberContainers = document.querySelectorAll('.number-container');
        numberContainers.forEach(container => {
            if (container) {
                container.style.display = totalItems > 0 ? 'flex' : 'none';
            }
        });
    }

    getTotalItems() {
        let total = 0;
        for (let [product, data] of this.cart) {
            total += data.quantity;
        }
        return total;
    }

    getTotalPrice() {
        let total = 0;
        for (let [product, data] of this.cart) {
            total += data.price * data.quantity;
        }
        return total;
    }

    getCartContents() {
        return Array.from(this.cart.entries()).map(([name, data]) => ({
            name: name,
            price: data.price,
            quantity: data.quantity,
            total: data.price * data.quantity
        }));
    }

    calculateDeliveryCost(address = '') {
        if (!address.trim()) {
            return 0;
        }

        const distance = this.estimateDistance(address);
        const additionalCost = Math.floor(distance / 2) * this.costPerKm;
        
        return this.baseDeliveryCost + additionalCost;
    }

    estimateDistance(address) {
        if (!address.toLowerCase().includes('ростов')) {
            return 10;
        }
        
        const addressLower = address.toLowerCase();

        if (addressLower.includes('эстонская') || address.includes('49')) {
            return 0;
        }
        else if (addressLower.includes('центр') || addressLower.includes('пушкин') || 
                 addressLower.includes('большая садовая') || addressLower.includes('киров')) {
            return 2;
        }
        else if (addressLower.includes('западный') || addressLower.includes('северный') ||
                 addressLower.includes('нагибина') || addressLower.includes('стачки')) {
            return 4;
        }
        else if (addressLower.includes('армянский') || addressLower.includes('александровка') ||
                 addressLower.includes('каменка') || addressLower.includes('орджоникидзе')) {
            return 6;
        }
        else {
            return 8;
        }
    }

    getCurrentAddress() {
        const addressInput = document.querySelector('.search-input');
        return addressInput ? addressInput.value.trim() : '';
    }

    saveToLocalStorage() {
        const cartData = Object.fromEntries(this.cart);
        localStorage.setItem('shoppingCart', JSON.stringify(cartData));
        console.log('💾 Корзина сохранена. Товаров:', this.getTotalItems());
    }

    loadFromLocalStorage() {
        const savedCart = localStorage.getItem('shoppingCart');
        if (savedCart) {
            try {
                const cartData = JSON.parse(savedCart);
                this.cart = new Map(Object.entries(cartData));
                console.log('📥 Корзина загружена из localStorage:', this.getTotalItems(), 'товаров');
            } catch (e) {
                console.error('Ошибка загрузки корзины:', e);
                this.cart = new Map();
            }
        } else {
            this.cart = new Map();
            console.log('🆕 Создана новая пустая корзина');
        }
    }

    clearCart() {
        const buttons = document.querySelectorAll('.product-btn.in-cart');
        buttons.forEach((button, index) => {
            setTimeout(() => {
                this.animateToAddState(button);
            }, index * 100);
        });
        
        this.cart.clear();
        this.updateCartDisplayWithAnimation();
        this.saveToLocalStorage();
        
        if (window.cartUI && window.cartUI.isOpen) {
            window.cartUI.updateCartUI();
        }
    }

    debug() {
        console.log('=== ДЕБАГ КОРЗИНЫ ===');
        console.log('Товаров в корзине:', this.getTotalItems());
        console.log('Общая стоимость:', this.getTotalPrice());
        console.log('Содержимое корзины:', this.getCartContents());
        console.log('Текущий адрес:', this.getCurrentAddress());
        console.log('Стоимость доставки:', this.calculateDeliveryCost(this.getCurrentAddress()));
        console.log('====================');
    }
}

const cartStyles = `
.product-btn.in-cart {
    background-color: #e74c3c !important;
}

.product-btn.in-cart:hover {
    background-color: #c0392b !important;
}

.product-btn * {
    pointer-events: none;
}

.ripple {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.6);
    transform: scale(0);
    animation: ripple-animation 0.6s linear;
    pointer-events: none;
}

@keyframes ripple-animation {
    to {
        transform: scale(4);
        opacity: 0;
    }
}

.number-container {
    background-color: white;
    border-radius: 50%;
    width: 22px;
    height: 22px;
    display: none;
    align-items: center;
    justify-content: center;
    margin-left: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
}

.number {
    color: #B43F20;
    font-size: 12px;
    font-weight: bold;
    transition: all 0.3s ease;
}

.confetti {
    animation: confetti-fall 1s ease-out forwards;
}

@keyframes confetti-fall {
    0% {
        transform: translateY(0) rotate(0deg);
        opacity: 1;
    }
    100% {
        transform: translateY(100px) rotate(360deg);
        opacity: 0;
    }
}

.fly-to-cart {
    z-index: 10000;
}

.remove-from-cart {
    z-index: 10000;
}
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = cartStyles;
document.head.appendChild(styleSheet);

document.addEventListener('DOMContentLoaded', () => {
    const cartManager = new CartManager();
    window.cartManager = cartManager;
    
    console.log('Корзина инициализирована. Товаров в корзине:', cartManager.getTotalItems());
});

window.resetCart = function() {
    localStorage.removeItem('shoppingCart');
    window.location.reload();
};

window.debugCart = function() {
    if (window.cartManager) {
        window.cartManager.debug();
    }
};

window.clearCart = function() {
    if (window.cartManager) {
        window.cartManager.clearCart();
    }
};