class CartManager {
    constructor() {
        this.cart = new Map();
        this.loadCart();
    }

    loadCart() {
        try {
            const savedCart = localStorage.getItem('userCart');
            if (savedCart) {
                const cartData = JSON.parse(savedCart);
                this.cart = new Map(cartData);
            }
        } catch (error) {
            console.error('Ошибка загрузки корзины:', error);
            this.cart = new Map();
        }
    }

    saveCart() {
        try {
            const cartArray = Array.from(this.cart.entries());
            localStorage.setItem('userCart', JSON.stringify(cartArray));
        } catch (error) {
            console.error('Ошибка сохранения корзины:', error);
        }
    }

    addToCart(productName, price, quantity = 1) {
        if (this.cart.has(productName)) {
            const existingItem = this.cart.get(productName);
            existingItem.quantity += quantity;
        } else {
            this.cart.set(productName, {
                name: productName,
                price: price,
                quantity: quantity
            });
        }
        this.saveCart();
        this.updateCartUI();
    }

    updateQuantity(productName, newQuantity) {
        if (this.cart.has(productName)) {
            if (newQuantity <= 0) {
                this.removeFromCart(productName);
            } else {
                const item = this.cart.get(productName);
                item.quantity = newQuantity;
                this.saveCart();
                this.updateCartUI();
            }
        }
    }

    removeFromCart(productName) {
        if (this.cart.has(productName)) {
            this.cart.delete(productName);
            this.saveCart();
            this.updateCartUI();
        }
    }

    clearCart() {
        this.cart.clear();
        this.saveCart();
        this.updateCartUI();
    }

    getCartContents() {
        return Array.from(this.cart.values());
    }

    getTotalItems() {
        return Array.from(this.cart.values()).reduce((total, item) => total + item.quantity, 0);
    }

    getTotalPrice() {
        return Array.from(this.cart.values()).reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    updateCartUI() {
        if (window.cartUI) {
            window.cartUI.updateCartUI();
        }
    }

    debug() {
        console.log('🛒 Корзина:', this.getCartContents());
        console.log('📦 Всего товаров:', this.getTotalItems());
        console.log('💰 Общая стоимость:', this.getTotalPrice());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.cartManager = new CartManager();
    console.log('🛒 CartManager инициализирован');
});

window.resetCart = function() {
    localStorage.removeItem('userCart');
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