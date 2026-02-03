// main.js - Главный файл инициализации приложения
class App {
    constructor() {
        this.components = {};
        this.init();
    }

    init() {
        console.log('🚀 Инициализация приложения...');
        
        // Инициализируем компоненты в правильном порядке
        this.initializeCartManager();
        this.initializeDeliveryDisplay();
        this.initializeCartUI();
        this.createAdditionalDisplays();
        
        console.log('✅ Приложение успешно инициализировано');
        this.debugInfo();
    }

    initializeCartManager() {
        if (!window.cartManager) {
            window.cartManager = new CartManager();
            this.components.cartManager = window.cartManager;
            console.log('🛒 CartManager инициализирован');
        }
    }

    initializeDeliveryDisplay() {
        if (window.cartManager && !window.deliveryDisplay) {
            window.deliveryDisplay = new DeliveryDisplay(window.cartManager);
            this.components.deliveryDisplay = window.deliveryDisplay;
            console.log('🚚 DeliveryDisplay инициализирован');
        }
    }

    initializeCartUI() {
        if (window.cartManager && !window.cartUI) {
            window.cartUI = new CartUI(window.cartManager);
            this.components.cartUI = window.cartUI;
            console.log('📱 CartUI инициализирован');
        }
    }

    createAdditionalDisplays() {
        // Создаем отображение в header если его нет
        this.createHeaderDisplay();
        
        // Создаем превью заказа
        this.createCheckoutPreview();
        
        console.log('📊 Дополнительные дисплеи созданы');
    }

    createHeaderDisplay() {
        const headerContainer = document.querySelector('.header-right');
        if (headerContainer && !headerContainer.querySelector('.delivery-display')) {
            window.deliveryDisplay.addCustomDisplay(headerContainer, 'compact', 'header-delivery-display');
        }
    }

    createCheckoutPreview() {
        // Создаем контейнер для превью заказа
        let previewContainer = document.querySelector('.checkout-preview');
        
        if (!previewContainer) {
            previewContainer = document.createElement('div');
            previewContainer.className = 'checkout-preview';
            previewContainer.style.cssText = `
                position: fixed;
                top: 120px;
                right: 20px;
                width: 280px;
                z-index: 998;
                background: transparent;
            `;
            
            document.body.appendChild(previewContainer);
        }

        // Добавляем отображение доставки в превью
        if (!previewContainer.querySelector('.delivery-display')) {
            window.deliveryDisplay.addCustomDisplay(previewContainer, 'preview', 'checkout-preview-delivery');
        }
    }

    debugInfo() {
        console.log('=== ИНФОРМАЦИЯ О ПРИЛОЖЕНИИ ===');
        console.log('Компоненты:', Object.keys(this.components));
        
        if (window.cartManager) {
            console.log('Товаров в корзине:', window.cartManager.getTotalItems());
        }
        
        if (window.deliveryDisplay) {
            console.log('Дисплеев доставки:', window.deliveryDisplay.displays.size);
        }
        console.log('=============================');
    }

    // Метод для обновления всех компонентов
    refresh() {
        if (window.cartManager) {
            window.cartManager.dispatchCartUpdate();
        }
        
        if (window.deliveryDisplay) {
            window.deliveryDisplay.refresh();
        }
        
        if (window.cartUI && window.cartUI.isOpen) {
            window.cartUI.updateCartUI();
        }
        
        console.log('🔄 Все компоненты обновлены');
    }

    // Метод для сброса приложения
    reset() {
        localStorage.clear();
        window.location.reload();
    }
}

// Глобальные вспомогательные функции
window.AppUtils = {
    // Добавить дисплей доставки в любой элемент
    addDeliveryDisplay: function(container, type = 'compact') {
        if (window.deliveryDisplay && container) {
            return window.deliveryDisplay.addCustomDisplay(container, type);
        }
        return null;
    },
    
    // Получить текущую информацию о заказе
    getOrderInfo: function() {
        if (window.deliveryDisplay) {
            return window.deliveryDisplay.getDisplayData();
        }
        return null;
    },
    
    // Обновить все дисплеи
    refreshDisplays: function() {
        if (window.deliveryDisplay) {
            window.deliveryDisplay.refresh();
        }
    },
    
    // Показать/скрыть корзину
    toggleCart: function() {
        if (window.cartUI) {
            if (window.cartUI.isOpen) {
                window.cartUI.close();
            } else {
                window.cartUI.open();
            }
        }
    },
    
    // Отладочная информация
    debug: function() {
        console.log('=== ОТЛАДОЧНАЯ ИНФОРМАЦИЯ ===');
        
        if (window.cartManager) {
            console.log('CartManager:');
            console.log('- Товаров:', window.cartManager.getTotalItems());
            console.log('- Сумма:', window.cartManager.getTotalPrice());
            console.log('- Адрес:', window.cartManager.getCurrentAddress());
        }
        
        if (window.deliveryDisplay) {
            console.log('DeliveryDisplay:');
            const data = window.deliveryDisplay.getDisplayData();
            console.log('- Данные:', data);
            console.log('- Дисплеев:', window.deliveryDisplay.displays.size);
        }
        
        if (window.cartUI) {
            console.log('CartUI:');
            console.log('- Открыта:', window.cartUI.isOpen);
        }
        
        console.log('============================');
    }
};

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    // Небольшая задержка для полной загрузки DOM
    setTimeout(() => {
        window.app = new App();
        
        // Добавляем глобальные обработчики
        this.addGlobalHandlers();
    }, 100);
});

// Глобальные обработчики событий
function addGlobalHandlers() {
    // Обновление при возвращении на страницу
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && window.app) {
            setTimeout(() => window.app.refresh(), 100);
        }
    });
    
    // Обновление при изменении размера окна
    window.addEventListener('resize', () => {
        if (window.deliveryDisplay) {
            setTimeout(() => window.deliveryDisplay.refresh(), 50);
        }
    });
    
    // Обработка сообщений от других вкладок
    window.addEventListener('storage', (e) => {
        if (e.key === 'shoppingCart' && window.app) {
            setTimeout(() => window.app.refresh(), 100);
        }
    });
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { App, AppUtils };
}