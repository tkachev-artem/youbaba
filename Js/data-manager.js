class DataManager {
    constructor() {
        this.data = {
            cart: new Map(),
            restaurantInfo: {
                name: "Название ресторана",
                address: "Эстонская 49А, Ростов-на-Дону",
                phone: "+7 (999) 123-45-67",
                workingHours: "10:00 - 23:00"
            },
            userPreferences: {
                lastAddress: "",
                theme: "light"
            }
        };
        this.init();
    }

    init() {
        this.loadFromLocalStorage();
        this.setupAutoSave();
        console.log('📊 DataManager инициализирован');
    }

    getCart() {
        return this.data.cart;
    }

    getCartContents() {
        return Array.from(this.data.cart.entries()).map(([name, data]) => ({
            name: name,
            price: data.price,
            quantity: data.quantity,
            total: data.price * data.quantity
        }));
    }

    getTotalItems() {
        let total = 0;
        for (let [product, data] of this.data.cart) {
            total += data.quantity;
        }
        return total;
    }

    getTotalPrice() {
        let total = 0;
        for (let [product, data] of this.data.cart) {
            total += data.price * data.quantity;
        }
        return total;
    }

    addToCart(productName, price) {
        if (this.data.cart.has(productName)) {
            const product = this.data.cart.get(productName);
            product.quantity += 1;
        } else {
            this.data.cart.set(productName, {
                price: price,
                quantity: 1,
                addedAt: new Date().getTime()
            });
        }
        
        this.saveToLocalStorage();
        this.dispatchCartUpdate();
        return this.data.cart.get(productName);
    }

    removeFromCart(productName) {
        const result = this.data.cart.delete(productName);
        this.saveToLocalStorage();
        this.dispatchCartUpdate();
        
        console.log(`🗑️ Товар "${productName}" удален из корзины`);
        console.log(`📊 Осталось товаров: ${this.getTotalItems()}`);
        
        return result;
    }

    clearCart() {
        const cartSize = this.data.cart.size;
        this.data.cart.clear();
        this.saveToLocalStorage();
        this.dispatchCartUpdate();
        
        console.log(`🧹 Корзина полностью очищена. Удалено товаров: ${cartSize}`);
    }

    updateQuantity(productName, newQuantity) {
        if (newQuantity <= 0) {
            return this.removeFromCart(productName);
        }

        if (this.data.cart.has(productName)) {
            this.data.cart.get(productName).quantity = newQuantity;
            this.saveToLocalStorage();
            this.dispatchCartUpdate();
            return true;
        }
        return false;
    }

    debugClearCart() {
        console.log('🧹 Принудительная очистка корзины...');
        this.data.cart.clear();
        this.saveToLocalStorage();
        this.dispatchCartUpdate();
        console.log('✅ Корзина очищена');
    }

    debugLogCart() {
        console.log('=== ДЕБАГ КОРЗИНЫ ===');
        console.log('Товаров в корзине:', this.getTotalItems());
        console.log('Содержимое:', this.getCartContents());
        console.log('localStorage данные:', localStorage.getItem('restaurantAppData'));
        console.log('========================');
    }

    getRestaurantInfo() {
        return this.data.restaurantInfo;
    }

    updateRestaurantInfo(updates) {
        this.data.restaurantInfo = {
            ...this.data.restaurantInfo,
            ...updates,
            updatedAt: new Date().toISOString()
        };
        this.saveToLocalStorage();
        this.dispatchDataUpdate('restaurantInfo');
        return this.data.restaurantInfo;
    }

    getUserPreferences() {
        return this.data.userPreferences;
    }

    updateUserPreferences(updates) {
        this.data.userPreferences = {
            ...this.data.userPreferences,
            ...updates
        };
        this.saveToLocalStorage();
        this.dispatchDataUpdate('userPreferences');
        return this.data.userPreferences;
    }

    loadFromLocalStorage() {
        try {
            const savedData = localStorage.getItem('restaurantAppData');
            if (savedData) {
                const parsedData = JSON.parse(savedData);

                if (parsedData.cart && Array.isArray(parsedData.cart)) {
                    this.data.cart = new Map(parsedData.cart);
                }

                this.data.restaurantInfo = { ...this.data.restaurantInfo, ...parsedData.restaurantInfo };
                this.data.userPreferences = { ...this.data.userPreferences, ...parsedData.userPreferences };
                
                console.log('📥 Данные загружены из localStorage');
            }
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
        }
    }

    saveToLocalStorage() {
        try {
            const dataToSave = {
                ...this.data,
                cart: Array.from(this.data.cart.entries())
            };
            
            localStorage.setItem('restaurantAppData', JSON.stringify(dataToSave));
        } catch (error) {
            console.error('Ошибка сохранения данных:', error);
        }
    }

    setupAutoSave() {
        window.addEventListener('beforeunload', () => {
            this.saveToLocalStorage();
        });

        setInterval(() => {
            this.saveToLocalStorage();
        }, 30000);
    }

    dispatchCartUpdate() {
        const event = new CustomEvent('cartUpdated', {
            detail: {
                cart: this.getCartContents(),
                totalItems: this.getTotalItems(),
                totalPrice: this.getTotalPrice()
            }
        });
        document.dispatchEvent(event);
    }

    dispatchDataUpdate(type) {
        const event = new CustomEvent('dataUpdated', {
            detail: { type, data: this.data[type] }
        });
        document.dispatchEvent(event);
    }

    debug() {
        console.log('=== ДАННЫЕ DATA MANAGER ===');
        console.log('Корзина:', this.getCartContents());
        console.log('Всего товаров:', this.getTotalItems());
        console.log('Общая стоимость:', this.getTotalPrice());
        console.log('Информация о ресторане:', this.data.restaurantInfo);
        console.log('========================');
    }
}

window.dataManager = new DataManager();