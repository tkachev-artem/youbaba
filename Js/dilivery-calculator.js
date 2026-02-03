// delivery-calculator.js
class DeliveryCalculator {
    constructor() {
        this.baseCost = 100;
        this.costPerKm = 25;
        this.maxDeliveryCost = 500;
        this.freeDeliveryRadius = 2;
        this.minOrderAmount = 1700;
        this.freeRollAmount = 2500;
        this.freeRollProduct = "Ролл запечённый с лососем";
        this.freeRollPrice = 700;
        this.pickupDiscount = 0.1;
        this.restaurantCoordinates = { lat: 47.225970, lng: 39.686114 };
        this.restaurantAddress = 'Эстонская улица, 49А';
        this.geocoder = null;
        this.isCheckoutPage = false;
        this.isFirstOrder = false;
        
        // Новая система выбора персон с приборами
        this.utensils = [
            { id: 'fork', name: 'Вилка', icon: '🍴', defaultQty: 1 },
            { id: 'spoon', name: 'Ложка', icon: '🥄', defaultQty: 1 },
            { id: 'chopsticks', name: 'Палочки', icon: '🥢', defaultQty: 1 },
            { id: 'napkins', name: 'Салфетки', icon: '🧻', defaultQty: 1 }
        ];
        
        this.persons = 1; // Количество персон по умолчанию
        this.maxPersons = 20; // Максимальное количество персон
        this.minPersons = 1; // Минимальное количество персон
        
        // Привязываем методы к контексту
        this.handleMinusClick = this.handleMinusClick.bind(this);
        this.handlePlusClick = this.handlePlusClick.bind(this);

        this.init();
    }

    init() {
        console.log('🚀 Инициализация точного калькулятора доставки');
        this.checkPageType();
        this.initGeocoder();
        this.bindEvents();
        
        this.addUtensilsStyles();
        
        if (this.isCheckoutPage) {
            this.createDeliveryElements();
            this.createFreeRollElements();
            this.createDiscountElements();
        }
        
        // Создаем селектор персон после загрузки DOM
        setTimeout(() => {
            this.createPersonsSelector();
        }, 100);
        
        this.loadPersonsFromStorage();
        
        this.interceptNextButton();
        this.checkFirstOrder();
        
        this.cleanupUtensilsFromCart();
    }

    // Метод для получения полных данных заказа для Telegram бота
    getOrderDataForTelegram() {
        try {
            console.log('📦 Формирование полных данных заказа для Telegram...');
            
            // Получаем данные из формы
            const phone = document.querySelector('input[name="phone"]')?.value || '';
            const name = document.querySelector('input[name="Name"]')?.value || '';
            const address = document.querySelector('input[name="address"]')?.value || '';
            
            // Получаем комментарий
            const commentTextarea = document.querySelector('textarea[name="comment"]');
            const comment = commentTextarea ? commentTextarea.value.trim() : '';
            
            console.log('💬 Получен комментарий:', {
                element: commentTextarea,
                value: comment,
                selector: 'textarea[name="comment"]'
            });
            
            // Способ оплаты
            const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value || 'sbp';
            const isCardPayment = paymentMethod === 'card';
            
            // Проверяем CartManager
            if (!window.cartManager) {
                console.error('❌ CartManager не найден');
                return null;
            }
            
            // Получаем данные корзины
            const cartData = window.cartManager.getCartContents ? window.cartManager.getCartContents() : [];
            const cartTotal = window.cartManager.getTotalPrice ? window.cartManager.getTotalPrice() : 0;
            
            console.log('🛒 Данные корзины:', {
                total: cartTotal,
                items: cartData.length,
                data: cartData
            });
            
            // Фильтруем товары для отображения (исключаем приборы и подарки)
            const displayCartItems = cartData.filter(item => {
                const lowerName = item.name.toLowerCase();
                
                // Исключаем приборы
                if (lowerName.includes('прибор:') || 
                    lowerName.includes('вилка') || 
                    lowerName.includes('ложка') || 
                    lowerName.includes('палочки') || 
                    lowerName.includes('салфетки') ||
                    lowerName.includes('билка') ||
                    lowerName.includes('ломка')) {
                    console.log('❌ Исключаем прибор из отображения:', item.name);
                    return false;
                }
                
                // Исключаем подарки (они будут показаны отдельно)
                if (item.isFree) {
                    console.log('🎁 Подарок будет показан отдельно:', item.name);
                    return false;
                }
                
                return true;
            });
            
            console.log('📊 Товары для отображения:', displayCartItems);
            
            // Проверяем подарки
            const hasFreeRoll = cartData.some(item => 
                item.isFree === true && item.name === this.freeRollProduct
            );
            
            console.log('🎁 Информация о подарках:', {
                hasFreeRoll,
                isFirstOrder: this.isFirstOrder
            });
            
            // Рассчитываем стоимость доставки
            let deliveryCost = 0;
            if (!isCardPayment && address) {
                const deliveryTotalElement = document.getElementById('delivery-total');
                if (deliveryTotalElement) {
                    const deliveryText = deliveryTotalElement.textContent;
                    if (!deliveryText.includes('Бесплатно') && deliveryText.includes('₽')) {
                        const match = deliveryText.match(/(\d+)\s*₽/);
                        deliveryCost = match ? parseInt(match[1]) : 0;
                    }
                }
            }
            
            // Рассчитываем скидку для самовывоза
            let discountAmount = 0;
            let discountPercentage = 0;
            if (isCardPayment && cartTotal > 0) {
                discountAmount = Math.round(cartTotal * this.pickupDiscount);
                discountPercentage = 10;
            }
            
            // Итоговая сумма
            const finalAmount = cartTotal + deliveryCost - discountAmount;
            
            // Получаем приборы с учетом количества персон
            const utensilsData = this.getUtensilsForOrder();
            console.log('🍽️ Данные о приборах:', utensilsData);
            
            // Формируем полные данные заказа
            const orderData = {
                order_id: `order_${Date.now()}`,
                customer_name: name,
                customer_phone: phone,
                customer_comment: comment,
                comment: comment, // Дублируем для совместимости
                delivery_address: isCardPayment ? 'Самовывоз - Эстонская улица, 49А, Ростов-на-Дону' : address,
                amount: finalAmount,
                original_amount: cartTotal + deliveryCost,
                delivery_cost: deliveryCost,
                discount_amount: discountAmount,
                discount_percentage: discountPercentage,
                payment_method: paymentMethod,
                cart_items: displayCartItems,
                utensils: utensilsData,
                utensils_count: utensilsData.length,
                persons: this.persons, // Добавляем количество персон
                has_free_roll: hasFreeRoll,
                free_roll_product: hasFreeRoll ? this.freeRollProduct : null,
                is_first_order: this.isFirstOrder,
                is_pickup: isCardPayment,
                timestamp: new Date().toISOString(),
                order_source: 'web_site'
            };
            
            console.log('📤 Полные данные для Telegram:', {
                name: orderData.customer_name,
                phone: orderData.customer_phone,
                comment: orderData.comment,
                amount: orderData.amount,
                address: orderData.delivery_address,
                persons: orderData.persons,
                utensils_count: orderData.utensils_count
            });
            return orderData;
            
        } catch (error) {
            console.error('❌ Ошибка формирования данных заказа:', error);
            return null;
        }
    }

    // Метод для отправки заказа в Telegram бота
    async sendOrderToTelegramBot() {
        try {
            console.log('🤖 Начинаем отправку заказа в Telegram бот...');
            
            // Получаем полные данные заказа
            const orderData = this.getOrderDataForTelegram();
            if (!orderData) {
                console.error('❌ Не удалось получить данные заказа');
                return false;
            }
            
            // Проверяем обязательные поля
            if (!orderData.customer_name || !orderData.customer_phone) {
                console.error('❌ Отсутствуют обязательные данные клиента');
                this.showNotification('Пожалуйста, заполните имя и телефон', 'error');
                return false;
            }
            
            console.log('📤 Отправляем данные в Telegram бот:', {
                name: orderData.customer_name,
                phone: orderData.customer_phone,
                amount: orderData.amount,
                persons: orderData.persons,
                utensils: orderData.utensils_count,
                comment: orderData.comment ? 'есть' : 'нет',
                comment_length: orderData.comment ? orderData.comment.length : 0
            });
            
            // Формируем сообщение для Telegram
            const telegramMessage = this.formatOrderForTelegram(orderData);
            
            // Отправляем POST запрос на сервер бота
            const response = await fetch('http://localhost:5001/api/new-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...orderData,
                    telegram_message: telegramMessage
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Заказ успешно отправлен в Telegram бот!');
                console.log('📝 ID заказа:', result.order_id);
                console.log('📨 ID сообщения в Telegram:', result.telegram_message_id);
                return true;
            } else {
                console.error('❌ Ошибка от Telegram бота:', result.error);
                this.showNotification('Ошибка отправки заказа в Telegram', 'error');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Критическая ошибка отправки в Telegram бот:', error);
            console.error('Подробности:', error.message);
            this.showNotification('Ошибка соединения с сервером', 'error');
            return false;
        }
    }

    // Метод для форматирования заказа для Telegram
    formatOrderForTelegram(orderData) {
        try {
            const date = new Date(orderData.timestamp);
            const formattedDate = date.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            const formattedTime = date.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            // Определяем тип заказа
            const orderType = orderData.is_pickup ? 'САМОВЫВОЗ' : 'ДОСТАВКА';
            
            // Формируем заголовок
            let message = `НОВЫЙ ЗАКАЗ - ${orderType}\n\n`;
            
            // Информация о заказе
            message += `Заказ №: ${orderData.order_id}\n`;
            message += `Время: ${formattedDate} ${formattedTime}\n`;
            message += `👥 Количество персон: ${orderData.persons}\n`;
            message += '─'.repeat(35) + '\n\n';
            
            // Информация о клиенте
            message += `Клиент:\n`;
            message += `Имя: ${orderData.customer_name}\n`;
            message += `Телефон: ${orderData.customer_phone}\n`;
            
            if (orderData.is_pickup) {
                message += `📍 Адрес самовывоза: ${orderData.delivery_address}\n`;
            } else {
                message += `📍 Адрес доставки: ${orderData.delivery_address}\n`;
            }
            
            message += '\n';
            
            // Состав заказа
            const totalItems = orderData.cart_items.reduce((sum, item) => sum + item.quantity, 0);
            message += `Состав заказа (${totalItems} шт.):\n`;
            
            orderData.cart_items.forEach(item => {
                const itemTotal = item.price * item.quantity;
                message += `• ${item.name} - ${item.quantity} шт. × ${item.price} ₽ = ${itemTotal} ₽\n`;
            });
            
            message += '\n';
            
            // Приборы и аксессуары (только если есть)
            const utensilsWithQuantity = orderData.utensils.filter(u => u.quantity > 0);
            if (utensilsWithQuantity.length > 0) {
                message += `🍽️ Приборы на ${orderData.persons} персон:\n`;
                utensilsWithQuantity.forEach(u => {
                    message += `• ${u.icon} ${u.name}: ${u.quantity} шт.\n`;
                });
                message += '\n';
            }
            
            // Разделитель
            message += '─'.repeat(35) + '\n\n';
            
            // Стоимость
            message += `Сумма товаров: ${orderData.original_amount - orderData.delivery_cost} ₽\n`;
            
            if (orderData.delivery_cost > 0) {
                message += `Стоимость доставки: ${orderData.delivery_cost} ₽\n`;
            } else if (!orderData.is_pickup) {
                message += `Стоимость доставки: Бесплатно\n`;
            }
            
            if (orderData.discount_amount > 0) {
                message += `Скидка (${orderData.discount_percentage}%): -${orderData.discount_amount} ₽\n`;
            }
            
            // Итоговая сумма
            if (orderData.discount_amount > 0) {
                const originalTotal = orderData.original_amount;
                message += `Итоговая сумма: ${originalTotal} ₽ → ${orderData.amount} ₽\n`;
            } else {
                message += `Итоговая сумма: ${orderData.amount} ₽\n`;
            }
            
            // Способ оплаты
            const paymentMethods = {
                'card': '💳 Карта онлайн',
                'sbp': '📱 СБП',
                'cash': '💵 Наличные'
            };
            message += `Способ оплата: ${paymentMethods[orderData.payment_method] || orderData.payment_method}\n\n`;
            
            // Комментарий (если есть)
            if (orderData.comment && orderData.comment.trim()) {
                message += `Комментарий:\n${orderData.comment}\n\n`;
            }
            
            // Подарки (если есть)
            const gifts = [];
            if (orderData.has_free_roll && orderData.free_roll_product) {
                gifts.push(orderData.free_roll_product);
            }
            
            if (gifts.length > 0) {
                message += `🎁 В заказе подарки:\n`;
                gifts.forEach(gift => {
                    message += `• ${gift}\n`;
                });
            } else if (orderData.original_amount - orderData.delivery_cost >= this.freeRollAmount) {
                message += `🎁 Клиент получает бесплатный ролл (заказ от ${this.freeRollAmount} ₽)\n`;
            }
            
            console.log('📝 Сформировано сообщение для Telegram:', {
                length: message.length,
                has_comment: orderData.comment ? true : false,
                persons: orderData.persons,
                utensils_count: utensilsWithQuantity.length
            });
            
            return message;
            
        } catch (error) {
            console.error('❌ Ошибка форматирования сообщения для Telegram:', error);
            return 'Ошибка формирования сообщения о заказе';
        }
    }

    // Метод для получения приборов в формате для заказа (с учетом количества персон)
    getUtensilsForOrder() {
        try {
            const result = this.utensils.map(u => ({
                id: u.id,
                name: u.name,
                quantity: u.defaultQty * this.persons, // Умножаем на количество персон
                icon: u.icon,
                price: 0
            }));
            
            console.log('🍽️ Приборы для заказа (на', this.persons, 'персон):', result);
            return result;
            
        } catch (error) {
            console.error('❌ Ошибка получения приборов:', error);
            return [];
        }
    }

    // Метод для показа уведомлений
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `delivery-notification delivery-notification-${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${icons[type]}</span>
                <span class="notification-text">${message}</span>
            </div>
        `;

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : type === 'warning' ? '#fff3cd' : '#d1ecf1'};
            color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : type === 'warning' ? '#856404' : '#0c5460'};
            padding: 12px 20px;
            border-radius: 8px;
            border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : type === 'warning' ? '#ffeaa7' : '#bee5eb'};
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            animation: slideInRight 0.3s ease;
            font-family: "Montserrat", sans-serif;
            font-size: 14px;
            font-weight: 500;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Стили для выбора персон - КОМПАКТНЫЙ ЛИНЕЙНЫЙ ВАРИАНТ
    addUtensilsStyles() {
        const styles = `
        .persons-selector-container {
            margin: 12px 0;
            padding: 12px 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border: 1px solid #e9ecef;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
        }
        
        .persons-selector-title {
            font-size: 14px;
            font-weight: 600;
            color: #333;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .persons-controls {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .persons-btn {
            width: 32px;
            height: 32px;
            border: none;
            border-radius: 6px;
            background: #B43F20;
            color: white;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            padding: 0;
            line-height: 1;
        }
        
        .persons-btn:hover:not(:disabled) {
            background: #9a3418;
        }
        
        .persons-btn:active:not(:disabled) {
            transform: scale(0.95);
        }
        
        .persons-btn:disabled {
            background: #cccccc;
            cursor: not-allowed;
            opacity: 0.5;
        }
        
        .persons-display {
            font-weight: 600;
            font-size: 18px;
            color: #333;
            min-width: 40px;
            text-align: center;
            padding: 0 10px;
        }
        
        @media (max-width: 768px) {
            .persons-selector-container {
                padding: 10px 12px;
                margin: 10px 0;
            }
            
            .persons-selector-title {
                font-size: 13px;
            }
            
            .persons-btn {
                width: 30px;
                height: 30px;
                font-size: 16px;
            }
            
            .persons-display {
                font-size: 16px;
                min-width: 35px;
            }
        }
        `;
        
        if (!document.querySelector('#utensils-styles')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'utensils-styles';
            styleElement.textContent = styles;
            document.head.appendChild(styleElement);
        }
    }

    createPersonsSelector() {
        // Ищем все возможные места для вставки счетчика
        const possibleContainers = [
            document.querySelector('.cart-items'),
            document.querySelector('.mini-cart-items'),
            document.querySelector('.cart-container'),
            document.querySelector('.cart-content'),
            document.querySelector('.order-form'),
            document.querySelector('.cart-footer')?.parentElement,
            document.querySelector('.cart-totals')?.parentElement,
            document.querySelector('.form-container'),
            document.querySelector('.checkout-form')
        ];
        
        // Находим первый подходящий контейнер
        let targetContainer = null;
        for (const container of possibleContainers) {
            if (container) {
                targetContainer = container;
                break;
            }
        }
        
        // Если контейнер найден и счетчик еще не создан
        if (targetContainer && !document.querySelector('.persons-selector-container')) {
            console.log('👥 Создаем селектор количества персон');
            
            // Создаем контейнер для счетчика
            const personsContainer = document.createElement('div');
            personsContainer.className = 'persons-selector-container';
            
            // Внутреннее содержимое
            personsContainer.innerHTML = `
                <div class="persons-selector-title">👥 Количество персон</div>
                <div class="persons-controls">
                    <button class="persons-btn persons-minus" type="button" ${this.persons <= this.minPersons ? 'disabled' : ''}>-</button>
                    <div class="persons-display">${this.persons}</div>
                    <button class="persons-btn persons-plus" type="button" ${this.persons >= this.maxPersons ? 'disabled' : ''}>+</button>
                </div>
            `;
            
            // Пытаемся найти лучшее место для вставки
            const cartTotals = document.querySelector('.cart-totals');
            const cartFooter = document.querySelector('.cart-footer');
            const orderForm = document.querySelector('.order-form');
            
            if (cartTotals) {
                // Вставляем перед итогами
                cartTotals.parentNode.insertBefore(personsContainer, cartTotals);
            } else if (cartFooter) {
                // Вставляем перед футером корзины
                cartFooter.parentNode.insertBefore(personsContainer, cartFooter);
            } else if (orderForm) {
                // Вставляем в начало формы
                orderForm.insertBefore(personsContainer, orderForm.firstChild);
            } else {
                // Вставляем в найденный контейнер
                targetContainer.appendChild(personsContainer);
            }
            
            // Привязываем события
            this.bindPersonsEvents();
            
            console.log('✅ Счетчик персон создан');
        } else if (document.querySelector('.persons-selector-container')) {
            // Если счетчик уже существует, просто обновляем его состояние
            this.updatePersonsUI();
        }
    }

    bindPersonsEvents() {
        // Удаляем старые обработчики, если они были
        const minusBtn = document.querySelector('.persons-minus');
        const plusBtn = document.querySelector('.persons-plus');
        
        if (minusBtn) {
            minusBtn.removeEventListener('click', this.handleMinusClick);
            minusBtn.addEventListener('click', this.handleMinusClick);
        }
        
        if (plusBtn) {
            plusBtn.removeEventListener('click', this.handlePlusClick);
            plusBtn.addEventListener('click', this.handlePlusClick);
        }
        
        console.log('✅ События счетчика привязаны');
    }

    handleMinusClick() {
        console.log('➖ Кнопка минус нажата');
        this.updatePersons(-1);
    }

    handlePlusClick() {
        console.log('➕ Кнопка плюс нажата');
        this.updatePersons(1);
    }

    updatePersons(delta) {
        console.log('👥 Обновление количества персон, delta:', delta);
        const newValue = this.persons + delta;
        
        if (newValue >= this.minPersons && newValue <= this.maxPersons) {
            this.persons = newValue;
            
            // Обновляем UI
            this.updatePersonsUI();
            
            // Сохраняем в хранилище
            this.savePersonsToStorage();
            
            // Показываем уведомление
            this.showNotification(`Количество персон: ${this.persons}`, 'info');
            
            console.log('✅ Количество персон обновлено:', this.persons);
        } else {
            console.log('❌ Невозможно обновить количество персон:', newValue);
        }
    }

    updatePersonsUI() {
        const personsDisplay = document.querySelector('.persons-display');
        const minusBtn = document.querySelector('.persons-minus');
        const plusBtn = document.querySelector('.persons-plus');
        
        if (personsDisplay) {
            personsDisplay.textContent = this.persons;
            console.log('📱 Обновлен дисплей:', this.persons);
        }
        
        if (minusBtn) {
            minusBtn.disabled = this.persons <= this.minPersons;
            console.log('➖ Кнопка минус:', minusBtn.disabled ? 'disabled' : 'enabled');
        }
        
        if (plusBtn) {
            plusBtn.disabled = this.persons >= this.maxPersons;
            console.log('➕ Кнопка плюс:', plusBtn.disabled ? 'disabled' : 'enabled');
        }
    }

    savePersonsToStorage() {
        const personsData = {
            persons: this.persons,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem('order_persons', JSON.stringify(personsData));
        console.log('💾 Количество персон сохранено в localStorage:', personsData);
    }

    loadPersonsFromStorage() {
        const saved = localStorage.getItem('order_persons');
        if (saved) {
            try {
                const personsData = JSON.parse(saved);
                if (personsData.persons && personsData.persons >= this.minPersons && personsData.persons <= this.maxPersons) {
                    this.persons = personsData.persons;
                    console.log('📂 Количество персон загружено из localStorage:', this.persons);
                }
            } catch (error) {
                console.error('❌ Ошибка загрузки количества персон из localStorage:', error);
            }
        }
    }

    cleanupUtensilsFromCart() {
        if (!window.cartManager) return;
        
        console.log('🧹 Очистка приборов из корзины...');
        
        const utensilPatterns = [
            'Прибор: Вилка',
            'Прибор: Ложка', 
            'Прибор: Палочки',
            'Прибор: Салфетки',
            'Вилка',
            'Ложка',
            'Палочки',
            'Салфетки',
            'Прибор: Билка',
            'Прибор: Ломка',
            'Билка',  
            'Ломка'
        ];
        
        utensilPatterns.forEach(name => {
            if (window.cartManager.cart[name]) {
                console.log('🗑️ Удаляем прибор из корзины:', name);
                delete window.cartManager.cart[name];
            }
        });
        
        for (const productName in window.cartManager.cart) {
            const lowerName = productName.toLowerCase();
            if (lowerName.includes('прибор:') || 
                lowerName.includes('вилка') || 
                lowerName.includes('ложка') || 
                lowerName.includes('палочки') || 
                lowerName.includes('салфетки') ||
                lowerName.includes('билка') ||
                lowerName.includes('ломка')) {
                console.log('🗑️ Удаляем прибор по совпадению:', productName);
                delete window.cartManager.cart[productName];
            }
        }
        
        console.log('✅ Очистка приборов завершена');
        
        if (window.cartManager.updateCartDisplay) {
            window.cartManager.updateCartDisplay();
        }
    }

    checkPageType() {
        const url = window.location.href.toLowerCase();
        const pathname = window.location.pathname.toLowerCase();
        
        this.isCheckoutPage = url.includes('checkout') || 
                              url.includes('order') || 
                              url.includes('оформление') ||
                              pathname.includes('checkout') ||
                              pathname.includes('order') ||
                              document.querySelector('.order-form') !== null ||
                              document.querySelector('input[name="phone"]') !== null ||
                              document.querySelector('.form-title') !== null;
        
        console.log(`📄 Тип страницы: ${this.isCheckoutPage ? 'Оформление заказа' : 'Корзина/Главная'}`);
    }

    initGeocoder() {
        if (typeof ymaps !== 'undefined') {
            this.geocoder = ymaps.geocode;
        }
    }

    createDeliveryElements() {
        if (!this.isCheckoutPage) return;
        
        let deliveryInfoElement = document.querySelector('.delivery-info');

        if (!deliveryInfoElement) {
            console.log('📦 Создаем блок информации о доставки');
            const cartFooter = document.querySelector('.cart-footer') || document.querySelector('.order-form') || document.querySelector('.form');
            if (cartFooter) {
                deliveryInfoElement = document.createElement('div');
                deliveryInfoElement.className = 'delivery-info';
                deliveryInfoElement.innerHTML = `
                    <div class="delivery-address">Адрес не указан</div>
                    <div class="delivery-distance">Расстояние: не рассчитано</div>
                    <div class="delivery-price">Стоимость доставки: 0 ₽</div>
                `;
                cartFooter.insertBefore(deliveryInfoElement, cartFooter.firstChild);
            }
        }

        this.ensureTotalElements();
    }

    createFreeRollElements() {
        if (!this.isCheckoutPage) return;
        
        const cartFooter = document.querySelector('.cart-footer') || document.querySelector('.order-form') || document.querySelector('.form');
        if (!cartFooter) return;

        let freeRollElement = document.querySelector('.free-roll-promo');
        if (!freeRollElement) {
            freeRollElement = document.createElement('div');
            freeRollElement.className = 'free-roll-promo';
            freeRollElement.style.display = 'none';
            
            const deliveryInfo = document.querySelector('.delivery-info');
            if (deliveryInfo) {
                deliveryInfo.insertAdjacentElement('afterend', freeRollElement);
            } else {
                cartFooter.insertBefore(freeRollElement, cartFooter.firstChild);
            }
        }
    }

    createDiscountElements() {
        if (!this.isCheckoutPage) return;
        
        const cartTotals = document.querySelector('.cart-totals') || document.querySelector('.order-totals') || document.querySelector('.other-container');
        if (!cartTotals) return;

        let discountRow = document.querySelector('.discount-row');
        if (!discountRow) {
            const productsRow = document.querySelector('.total-row:nth-child(1)');
            if (productsRow) {
                const discountHTML = `
                    <div class="total-row discount-row" style="display: none;">
                        <span class="total-label">🎉 Скидка 10% (самовывоз):</span>
                        <span class="total-value" id="discount-total">-0 ₽</span>
                    </div>
                `;
                productsRow.insertAdjacentHTML('afterend', discountHTML);
            }
        }
    }

    checkFirstOrder() {
        const hasOrderedBefore = localStorage.getItem('hasOrderedBefore');
        if (!hasOrderedBefore) {
            console.log('🎉 Это первый заказ!');
            this.isFirstOrder = true;
        } else {
            console.log('✅ Это не первый заказ');
            this.isFirstOrder = false;
        }
    }

    markOrderAsCompleted() {
        localStorage.setItem('hasOrderedBefore', 'true');
        this.isFirstOrder = false;
        console.log('✅ Заказ помечен как выполненный');
    }

    interceptNextButton() {
        const interceptButtons = () => {
            const nextButtons = document.querySelectorAll('button, a, input[type="submit"]');
            
            nextButtons.forEach(button => {
                const buttonText = button.textContent?.toLowerCase() || button.value?.toLowerCase() || '';
                
                if (buttonText.includes('далее') || 
                    buttonText.includes('next') || 
                    buttonText.includes('оформить') || 
                    buttonText.includes('заказать') ||
                    buttonText.includes('checkout') ||
                    buttonText.includes('оплатить') ||
                    button.classList.contains('next-button') ||
                    button.classList.contains('order-btn') ||
                    button.id.includes('next') ||
                    button.id.includes('checkout')) {
                    
                    // Убираем все проверки и ограничения
                    if (!button.hasAttribute('data-original-onclick')) {
                        button.setAttribute('data-original-onclick', button.onclick ? button.onclick.toString() : '');
                    }
                    
                    // Убираем проверку минимальной суммы
                    button.addEventListener('click', (e) => {
                        // Никаких ограничений - кнопка всегда кликабельна
                        console.log('✅ Кнопка "Далее" нажата без ограничений');
                    });
                    
                    const form = button.closest('form');
                    if (form && !form.hasAttribute('data-min-order-checked')) {
                        form.setAttribute('data-min-order-checked', 'true');
                        form.addEventListener('submit', (e) => {
                            // Никаких ограничений - форма всегда отправляется
                            console.log('✅ Форма отправляется без ограничений');
                        });
                    }
                }
            });
        };

        interceptButtons();
        setInterval(interceptButtons, 2000);
    }

    ensureTotalElements() {
        if (!this.isCheckoutPage) return;
        
        const cartTotals = document.querySelector('.cart-totals') || document.querySelector('.order-totals') || document.querySelector('.other-container');
        if (!cartTotals) return;

        let deliveryRow = document.querySelector('.total-row:nth-child(2)');
        if (!deliveryRow || !deliveryRow.querySelector('#delivery-total')) {
            console.log('💰 Создаем строку доставки в итогах');

            const productsRow = document.querySelector('.total-row:nth-child(1)');
            if (productsRow) {
                const deliveryHTML = `
                    <div class="total-row">
                        <span class="total-label">Стоимость доставки:</span>
                        <span class="total-value" id="delivery-total">0 ₽</span>
                    </div>
                `;
                productsRow.insertAdjacentHTML('afterend', deliveryHTML);
            }
        }

        let freeRollRow = document.querySelector('.free-roll-row');
        if (!freeRollRow) {
            const deliveryRow = document.querySelector('#delivery-total')?.closest('.total-row');
            if (deliveryRow) {
                const freeRollHTML = `
                    <div class="total-row free-roll-row" style="display: none;">
                        <span class="total-label">🎁 Подарок (бесплатный ролл):</span>
                        <span class="total-value" id="free-roll-total">Ролл запечённый с лососем</span>
                    </div>
                `;
                deliveryRow.insertAdjacentHTML('afterend', freeRollHTML);
            }
        }
    }

    bindEvents() {
        document.addEventListener('addressSelected', (e) => {
            console.log('📍 Адрес выбран:', e.detail);
            setTimeout(() => this.updateDeliveryCostInUI(), 300);
        });

        const addressInput = document.querySelector('.search-input');
        if (addressInput) {
            addressInput.addEventListener('input', () => {
                setTimeout(() => this.updateDeliveryCostInUI(), 1000);
            });
        }

        document.addEventListener('cartOpened', () => {
            setTimeout(() => this.updateDeliveryCostInUI(), 500);
        });

        document.addEventListener('cartUpdated', () => {
            setTimeout(() => this.updateDeliveryCostInUI(), 300);
            this.cleanupUtensilsFromCart();
        });

        document.addEventListener('change', (e) => {
            if (e.target && e.target.name === 'payment') {
                this.updateDeliveryCostInUI();
            }
        });

        console.log('✅ События доставки привязаны');
    }

    async calculateDeliveryCost(address, orderTotal = 0) {
        if (!address || address.trim().length === 0) {
            return { cost: 0, distance: 0, error: 'Адрес не указан' };
        }

        try {
            const distance = await this.calculateExactDistance(address);
            let cost = 0;

            if (this.isRestaurantAddress(address) || distance <= this.freeDeliveryRadius) {
                cost = 0;
                console.log('🎉 Бесплатная доставка!', {
                    isRestaurant: this.isRestaurantAddress(address),
                    distance: distance
                });
            } else {
                cost = this.baseCost + (distance * this.costPerKm);
                cost = Math.min(Math.round(cost), this.maxDeliveryCost);
            }

            return {
                cost: cost,
                distance: Math.round(distance * 10) / 10,
                restaurantAddress: this.restaurantAddress,
                deliveryAddress: address,
                isFree: cost === 0,
                error: null
            };
        } catch (error) {
            console.error('Ошибка расчета доставки:', error);
            return {
                cost: 0,
                distance: 0,
                error: 'Не удалось рассчитать расстояние'
            };
        }
    }

    isRestaurantAddress(address) {
        if (!address) return false;

        const addressLower = address.toLowerCase().trim();
        const restaurantLower = this.restaurantAddress.toLowerCase();

        const restaurantVariants = [
            'эстонская улица, 49а',
            'эстонская ул, 49а',
            'эстонская, 49а',
            'эстонская 49а',
            'эстонская 49 а',
            'улица эстонская, 49а',
            'ул эстонская, 49а'
        ];

        return restaurantVariants.some(variant =>
            addressLower.includes(variant) ||
            addressLower === variant
        );
    }

    async calculateExactDistance(deliveryAddress) {
        return new Promise(async (resolve, reject) => {
            try {
                if (this.isRestaurantAddress(deliveryAddress)) {
                    console.log('📍 Это адрес ресторана, расстояние = 0');
                    resolve(0);
                    return;
                }

                if (this.geocoder) {
                    const restaurantCoords = this.restaurantCoordinates;

                    this.geocoder(deliveryAddress).then((res) => {
                        const deliveryCoords = res.geoObjects.get(0).geometry.getCoordinates();

                        const distance = this.calculateHaversineDistance(
                            restaurantCoords.lat,
                            restaurantCoords.lng,
                            deliveryCoords[0],
                            deliveryCoords[1]
                        );

                        resolve(distance);
                    }).catch(error => {
                        console.warn('Yandex Geocoder error, using fallback:', error);
                        this.calculateDistanceWithFallback(deliveryAddress).then(resolve).catch(reject);
                    });
                } else {
                    await this.calculateDistanceWithFallback(deliveryAddress).then(resolve).catch(reject);
                }
            } catch (error) {
                console.warn('Geocoding failed, using estimation:', error);
                const estimatedDistance = this.estimateDistanceByAddress(deliveryAddress);
                resolve(estimatedDistance);
            }
        });
    }

    async calculateDistanceWithFallback(address) {
        if (this.isRestaurantAddress(address)) {
            return 0;
        }

        try {
            const encodedAddress = encodeURIComponent(address + ', Ростов-на-Дону');
            const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(`https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`)}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data && data.length > 0) {
                const deliveryLat = parseFloat(data[0].lat);
                const deliveryLon = parseFloat(data[0].lon);

                const distance = this.calculateHaversineDistance(
                    this.restaurantCoordinates.lat,
                    this.restaurantCoordinates.lng,
                    deliveryLat,
                    deliveryLon
                );

                return distance;
            } else {
                throw new Error('Адрес не найден');
            }
        } catch (error) {
            console.warn('OSM API error, using estimation:', error);
            return this.estimateDistanceByAddress(address);
        }
    }

    calculateHaversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return distance * 1.4;
    }

    deg2rad(deg) {
        return deg * (Math.PI / 180);
    }

    estimateDistanceByAddress(address) {
        if (!address) return 5;

        if (this.isRestaurantAddress(address)) {
            return 0;
        }

        const addressLower = address.toLowerCase();

        const coordinates = {
            'эстонская': { dist: 0.1 },
            'пролетарский': { dist: 1.5 },
            'кировский': { dist: 1.8 },
            'центр': { dist: 2.0 },
            'советский': { dist: 3.0 },
            'ленинский': { dist: 3.5 },
            'театральная': { dist: 2.5 },
            'большая садовая': { dist: 2.8 },
            'воронцовская': { dist: 3.2 },
            'северный': { dist: 6.0 },
            'западный': { dist: 7.5 },
            'нагибина': { dist: 4.5 },
            'стачки': { dist: 5.0 },
            'маршала жукова': { dist: 8.0 },
            'александровка': { dist: 12.0 },
            'новое поселение': { dist: 15.0 },
            'зарма': { dist: 18.0 },
            'армянский': { dist: 20.0 }
        };

        for (const [key, value] of Object.entries(coordinates)) {
            if (addressLower.includes(key)) {
                console.log(`📍 Найдено совпадение: ${key}, расстояние: ${value.dist} км`);
                return value.dist;
            }
        }

        return 5.0;
    }

    async updateDeliveryCostInUI() {
        console.log('🔄 Обновление стоимости доставки в UI');
        
        if (!this.isCheckoutPage) {
            const cartManager = window.cartManager;
            const orderTotal = cartManager ? cartManager.getTotalPrice() : 0;
            this.manageGiftsInCart(orderTotal);
            return;
        }

        const addressInput = document.querySelector('.search-input');
        const address = addressInput ? addressInput.value.trim() : '';
        const cartManager = window.cartManager;
        const orderTotal = cartManager ? cartManager.getTotalPrice() : 0;

        const paymentChecked = document.querySelector('input[name="payment"]:checked');
        const isCardPayment = paymentChecked && paymentChecked.value === 'card';

        if (isCardPayment) {
            console.log('💳 Оплата картой — доставка бесплатная');
            this.updateAllDeliveryElements(address, {
                cost: 0,
                distance: 0,
                isFree: true,
                error: null
            }, orderTotal);
            return;
        }

        console.log('📊 Данные для расчета:', { address, orderTotal });

        this.showLoadingState();

        try {
            const deliveryInfo = await this.calculateDeliveryCost(address, orderTotal);
            console.log('📦 Результат расчета:', deliveryInfo);

            this.updateAllDeliveryElements(address, deliveryInfo, orderTotal);
        } catch (error) {
            console.error('Ошибка при расчете доставки:', error);
            this.showErrorState();
        }
    }

    showLoadingState() {
        if (!this.isCheckoutPage) return;
        
        const deliveryPriceElement = document.querySelector('.delivery-price');
        const deliveryDistanceElement = document.querySelector('.delivery-distance');

        if (deliveryPriceElement) {
            deliveryPriceElement.textContent = 'Расчет стоимости...';
            deliveryPriceElement.style.color = '#666';
        }

        if (deliveryDistanceElement) {
            deliveryDistanceElement.textContent = 'Определяем расстояние...';
        }
    }

    showErrorState() {
        if (!this.isCheckoutPage) return;
        
        const deliveryPriceElement = document.querySelector('.delivery-price');
        const deliveryDistanceElement = document.querySelector('.delivery-distance');

        if (deliveryPriceElement) {
            deliveryPriceElement.textContent = 'Ошибка расчета доставки';
            deliveryPriceElement.style.color = '#dc3545';
        }

        if (deliveryDistanceElement) {
            deliveryDistanceElement.textContent = 'Не удалось определить расстояние';
        }
    }

    updateAllDeliveryElements(address, deliveryInfo, orderTotal) {
        if (!this.isCheckoutPage) return;
        
        const deliveryAddressElement = document.querySelector('.delivery-address');
        const deliveryDistanceElement = document.querySelector('.delivery-distance');
        const deliveryPriceElement = document.querySelector('.delivery-price');

        if (deliveryAddressElement) {
            deliveryAddressElement.textContent = address ? `Адрес: ${address}` : 'Адрес не указан';
            deliveryAddressElement.style.color = address ? '#333' : '#666';
        }

        if (deliveryDistanceElement) {
            if (deliveryInfo.distance > 0) {
                deliveryDistanceElement.textContent = `Расстояние: ${deliveryInfo.distance} км`;
                deliveryDistanceElement.style.color = '#28a745';
            } else if (deliveryInfo.error) {
                deliveryDistanceElement.textContent = deliveryInfo.error;
                deliveryDistanceElement.style.color = '#dc3545';
            } else {
                deliveryDistanceElement.textContent = 'Расстояние: не рассчитано';
                deliveryDistanceElement.style.color = '#666';
            }
        }

        if (deliveryPriceElement) {
            if (deliveryInfo.isFree) {
                deliveryPriceElement.textContent = '🎉 Доставка бесплатная!';
                deliveryPriceElement.style.color = '#28a745';
                deliveryPriceElement.style.fontWeight = '600';
            } else if (deliveryInfo.cost > 0) {
                deliveryPriceElement.textContent = `Стоимость доставки: ${deliveryInfo.cost} ₽`;
                deliveryPriceElement.style.color = '#B43F20';
                deliveryPriceElement.style.fontWeight = '600';
            } else if (deliveryInfo.error) {
                deliveryPriceElement.textContent = deliveryInfo.error;
                deliveryPriceElement.style.color = '#dc3545';
            } else {
                deliveryPriceElement.textContent = 'Стоимость доставки: 0 ₽';
                deliveryPriceElement.style.color = '#666';
            }
        }

        const deliveryTotalElement = document.getElementById('delivery-total');
        if (deliveryTotalElement) {
            if (deliveryInfo.isFree) {
                deliveryTotalElement.textContent = 'Бесплатно';
                deliveryTotalElement.style.color = '#28a745';
                deliveryTotalElement.style.fontWeight = '600';
            } else {
                deliveryTotalElement.textContent = `${deliveryInfo.cost} ₽`;
                deliveryTotalElement.style.color = deliveryInfo.cost > 0 ? '#B43F20' : '#666';
                deliveryTotalElement.style.fontWeight = deliveryInfo.cost > 0 ? '600' : 'normal';
            }
        }

        const discountInfo = this.calculateDiscount(orderTotal);
        const finalTotal = orderTotal + (deliveryInfo.isFree ? 0 : deliveryInfo.cost) - discountInfo.amount;

        const finalTotalElement = document.getElementById('final-total');
        if (finalTotalElement) {
            finalTotalElement.textContent = `${finalTotal} ₽`;
            finalTotalElement.style.fontWeight = '600';
        }

        const productsTotalElement = document.getElementById('products-total');
        if (productsTotalElement && window.cartManager) {
            productsTotalElement.textContent = `${orderTotal} ₽`;
        }

        const deliveryInfoElement = document.querySelector('.delivery-info');
        if (deliveryInfoElement) {
            deliveryInfoElement.style.display = 'block';
        }
        
        if (this.isCheckoutPage) {
            this.updateFreeRollPromo(orderTotal);
            this.updateDiscountDisplay(discountInfo);
        }

        console.log('🎉 Все элементы доставки обновлены!');
    }

    manageGiftsInCart(orderTotal) {
        if (orderTotal >= this.freeRollAmount) {
            this.addFreeRollToCart();
        } else {
            this.removeFreeRollFromCart();
        }
    }

    calculateDiscount(orderTotal) {
        if (!this.isCheckoutPage) {
            return {
                hasDiscount: false,
                amount: 0,
                percentage: 0,
                originalTotal: orderTotal,
                discountedTotal: orderTotal
            };
        }
        
        const paymentChecked = document.querySelector('input[name="payment"]:checked');
        const isCardPayment = paymentChecked && paymentChecked.value === 'card';
        
        if (isCardPayment && orderTotal > 0) {
            const discountAmount = Math.round(orderTotal * this.pickupDiscount);
            return {
                hasDiscount: true,
                amount: discountAmount,
                percentage: this.pickupDiscount * 100,
                originalTotal: orderTotal,
                discountedTotal: orderTotal - discountAmount
            };
        }
        
        return {
            hasDiscount: false,
            amount: 0,
            percentage: 0,
            originalTotal: orderTotal,
            discountedTotal: orderTotal
        };
    }

    updateDiscountDisplay(discountInfo) {
        if (!this.isCheckoutPage) return;
        
        const discountRow = document.querySelector('.discount-row');
        const discountTotalElement = document.getElementById('discount-total');
        
        if (discountRow && discountTotalElement) {
            if (discountInfo.hasDiscount) {
                discountTotalElement.textContent = `-${discountInfo.amount} ₽`;
                discountTotalElement.style.color = '#28a745';
                discountTotalElement.style.fontWeight = '600';
                discountRow.style.display = 'flex';
            } else {
                discountRow.style.display = 'none';
            }
        }
    }

    updateFreeRollPromo(orderTotal) {
        if (!this.isCheckoutPage) return;
        
        const freeRollPromo = document.querySelector('.free-roll-promo');
        const freeRollRow = document.querySelector('.free-roll-row');
        const remaining = this.freeRollAmount - orderTotal;

        if (!freeRollPromo) return;

        if (orderTotal >= this.freeRollAmount) {
            freeRollPromo.innerHTML = `
                <div class="free-roll-active">
                    <strong>🎉 Поздравляем!</strong><br>
                    Вам полагается <strong>${this.freeRollProduct}</strong> в подарок!
                </div>
            `;
            freeRollPromo.style.display = 'block';
            freeRollPromo.className = 'free-roll-promo free-roll-active';

            if (freeRollRow) {
                freeRollRow.style.display = 'flex';
            }

        } else if (orderTotal > this.minOrderAmount && orderTotal < this.freeRollAmount) {
            freeRollPromo.innerHTML = `
                <div class="free-roll-progress">
                    <strong>🎁 До бесплатного ролла осталось ${remaining} ₽</strong><br>
                    Добавьте товаров на ${remaining} ₽ и получите <strong>${this.freeRollProduct}</strong> в подарок!
                </div>
            `;
            freeRollPromo.style.display = 'block';
            freeRollPromo.className = 'free-roll-promo free-roll-progress';

            if (freeRollRow) {
                freeRollRow.style.display = 'none';
            }
            
        } else {
            freeRollPromo.style.display = 'none';
            
            if (freeRollRow) {
                freeRollRow.style.display = 'none';
            }
        }
    }

    addFreeRollToCart() {
        if (!window.cartManager) return;

        const cartItems = window.cartManager.getCartContents();
        const hasFreeRoll = cartItems.some(item => 
            item.name === this.freeRollProduct && item.isFree === true
        );

        if (!hasFreeRoll) {
            console.log('🎁 Добавляем бесплатный ролл в корзину');
            window.cartManager.addToCart(this.freeRollProduct, 0, true);
        }
    }

    removeFreeRollFromCart() {
        if (!window.cartManager) return;

        const cartItems = window.cartManager.getCartContents();
        const freeRollItem = cartItems.find(item => 
            item.name === this.freeRollProduct && item.isFree === true
        );

        if (freeRollItem) {
            console.log('🗑️ Удаляем бесплатный ролл из корзины');
            window.cartManager.removeFromCart(this.freeRollProduct);
        }
    }
}

class PaymentIntegration {
    constructor() {
        this.backendUrl = 'http://localhost:5007';
        this.isProcessing = false;
        this.minOrderAmount = 1700;
        this.freeRollAmount = 2500;
        this.pickupDiscount = 0.1;
        this.init();
    }

    init() {
        console.log('💳 Инициализация платежной системы');
        this.bindPaymentEvents();
        this.updateOrderButtonState();
        
        // Перехватываем все формы для отправки в Telegram
        this.interceptForms();
    }

    bindPaymentEvents() {
        this.unbindPaymentEvents();
        
        const paymentRadios = document.querySelectorAll('input[name="payment"]');
        paymentRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.handlePaymentMethodChange();
            });
        });

        const orderBtn = document.querySelector('.order-btn');
        if (orderBtn) {
            orderBtn.removeEventListener('click', this.boundProcessPayment);
            this.boundProcessPayment = this.processPayment.bind(this);
            orderBtn.addEventListener('click', this.boundProcessPayment);
        }

        document.addEventListener('cartUpdated', () => {
            setTimeout(() => this.updateOrderButtonState(), 100);
        });

        document.addEventListener('cartOpened', () => {
            setTimeout(() => this.updateOrderButtonState(), 100);
        });

        setInterval(() => this.updateOrderButtonState(), 2000);
    }

    unbindPaymentEvents() {
        const orderBtn = document.querySelector('.order-btn');
        if (orderBtn && this.boundProcessPayment) {
            orderBtn.removeEventListener('click', this.boundProcessPayment);
        }
    }

    // Перехватываем все формы для отправки в Telegram
    interceptForms() {
        const interceptFormSubmissions = () => {
            const forms = document.querySelectorAll('form');
            
            forms.forEach(form => {
                if (!form.hasAttribute('data-telegram-intercept')) {
                    form.setAttribute('data-telegram-intercept', 'true');
                    
                    const originalSubmit = form.onsubmit;
                    
                    form.addEventListener('submit', async (e) => {
                        // Отправляем заказ в Telegram
                        if (window.deliveryCalculator && window.deliveryCalculator.sendOrderToTelegramBot) {
                            console.log('📤 Отправка заказа в Telegram бот через перехват формы...');
                            const telegramSent = await window.deliveryCalculator.sendOrderToTelegramBot();
                            
                            if (!telegramSent) {
                                console.warn('⚠️ Не удалось отправить заказ в Telegram через форму');
                            } else {
                                console.log('✅ Заказ успешно отправлен в Telegram через перехват формы');
                            }
                        }
                        
                        // Вызываем оригинальный обработчик
                        if (originalSubmit) {
                            return originalSubmit.call(form, e);
                        }
                    });
                }
            });
        };

        interceptFormSubmissions();
        setInterval(interceptFormSubmissions, 2000);
    }

    updateOrderButtonState() {
        const orderBtn = document.querySelector('.order-btn');
        if (!orderBtn) return;

        const cartTotal = window.cartManager ? window.cartManager.getTotalPrice() : 0;
        
        // Убираем все ограничения - кнопка всегда активна
        orderBtn.disabled = false;
        orderBtn.style.opacity = '1';
        orderBtn.style.cursor = 'pointer';
        orderBtn.title = 'Оформить заказ';
        
        // Если корзина пуста, показываем соответствующее сообщение
        if (cartTotal <= 0) {
            orderBtn.textContent = 'Корзина пуста';
        } else {
            // Показываем итоговую сумму вместо "Минимум 1700 ₽"
            orderBtn.textContent = `Оформить заказ (${cartTotal} ₽)`;
        }
    }

    async processPayment(e) {
        if (this.isProcessing) {
            console.log('⚠️ Запрос уже обрабатывается, пропускаем...');
            return;
        }

        try {
            this.isProcessing = true;
            
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }

            const cartTotal = window.cartManager ? window.cartManager.getTotalPrice() : 0;
            
            // Убираем проверку минимальной суммы
            if (cartTotal <= 0) {
                this.showError('Корзина пуста! Добавьте товары перед оформлением заказа.');
                this.isProcessing = false;
                return;
            }

            const selectedPayment = document.querySelector('input[name="payment"]:checked');
            if (!selectedPayment) {
                this.showError('Выберите способ оплаты');
                this.isProcessing = false;
                return;
            }

            if (!this.validateForm(selectedPayment.value)) {
                this.isProcessing = false;
                return;
            }

            this.showLoading(true);

            // Помечаем заказ как выполненный
            if (window.deliveryCalculator) {
                window.deliveryCalculator.markOrderAsCompleted();
            }

            // Отправляем в Telegram бот ПЕРВЫМ ДЕЛОМ
            let telegramSent = false;
            if (window.deliveryCalculator && window.deliveryCalculator.sendOrderToTelegramBot) {
                console.log('📤 Отправка заказа в Telegram бот...');
                telegramSent = await window.deliveryCalculator.sendOrderToTelegramBot();
                
                if (!telegramSent) {
                    console.warn('⚠️ Не удалось отправить заказ в Telegram');
                    this.showNotification('Заказ оформлен, но не отправлен в Telegram. Свяжитесь с администратором.', 'warning');
                } else {
                    console.log('✅ Заказ успешно отправлен в Telegram');
                }
            }

            if (selectedPayment.value === 'card') {
                await this.createPickupOrder(telegramSent);
            } else {
                await this.createPayment(telegramSent);
            }

        } catch (error) {
            console.error('Payment processing error:', error);
            this.showError('Ошибка: ' + error.message);
        } finally {
            this.isProcessing = false;
            this.showLoading(false);
        }
    }

    async createPickupOrder(telegramSent) {
        try {
            console.log('🚶 Создание заказа на самовывоз...');
            
            // Получаем данные для бэкенда
            const orderData = this.getOrderData();
            if (!orderData) {
                this.showError('Не удалось получить данные заказа');
                return;
            }
            
            // Пытаемся отправить в Telegram еще раз, если не получилось с первого раза
            if (!telegramSent && window.deliveryCalculator) {
                console.log('🔄 Повторная попытка отправки в Telegram...');
                telegramSent = await window.deliveryCalculator.sendOrderToTelegramBot();
            }
            
            // Отправляем на бэкенд
            const response = await fetch(`${this.backendUrl}/api/create-pickup-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.showSuccess('✅ Заказ успешно оформлен! Ожидайте готовности.');
                
                // Очищаем корзину
                if (window.cartManager) {
                    window.cartManager.clearCart();
                }
                
                // Очищаем приборы
                if (window.deliveryCalculator) {
                    window.deliveryCalculator.utensils.forEach(utensil => {
                        utensil.defaultQty = 1;
                    });
                    window.deliveryCalculator.persons = 1;
                    window.deliveryCalculator.savePersonsToStorage();
                }
                
                // Редирект через 3 секунды
                setTimeout(() => {
                    window.location.href = '/Pages/index.html';
                }, 3000);
                
            } else {
                this.showError(result.error || 'Ошибка при оформлении заказа');
            }
        } catch (error) {
            console.error('Pickup order error:', error);
            this.showError('Ошибка сети: ' + error.message);
        }
    }

    async createPayment(telegramSent) {
        try {
            console.log('💳 Создание онлайн-платежа...');
            
            // Получаем данные для бэкенда
            const orderData = this.getOrderData();
            if (!orderData) {
                this.showError('Не удалось получить данные заказа');
                return;
            }
            
            // Пытаемся отправить в Telegram еще раз, если не получилось с первого раза
            if (!telegramSent && window.deliveryCalculator) {
                console.log('🔄 Повторная попытка отправки в Telegram...');
                telegramSent = await window.deliveryCalculator.sendOrderToTelegramBot();
            }
            
            // Отправляем на бэкенд
            const response = await fetch(`${this.backendUrl}/api/create-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.redirectToPayment(result.payment_url, result.order_id);
            } else {
                this.showError(result.error || 'Ошибка при создании платежа');
            }
        } catch (error) {
            console.error('Payment creation error:', error);
            this.showError('Ошибка сети: ' + error.message);
        }
    }

    getOrderData() {
        try {
            console.log('📝 Получение данных заказа для бэкенда...');
            
            const phone = document.querySelector('input[name="phone"]')?.value || '';
            const name = document.querySelector('input[name="Name"]')?.value || '';
            const address = document.querySelector('input[name="address"]')?.value || '';
            
            // Получаем комментарий
            const commentTextarea = document.querySelector('textarea[name="comment"]');
            const comment = commentTextarea ? commentTextarea.value.trim() : '';
            
            console.log('💬 Комментарий для бэкенда:', {
                element: commentTextarea,
                value: comment,
                length: comment.length
            });
            
            const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value || 'sbp';
            
            if (!window.cartManager) {
                throw new Error('CartManager не найден');
            }
            
            const cartData = window.cartManager.getCartContents ? window.cartManager.getCartContents() : [];
            const cartTotal = window.cartManager.getTotalPrice ? window.cartManager.getTotalPrice() : 0;
            
            // Фильтруем товары для бэкенда
            const filteredCartData = cartData.filter(item => {
                const lowerName = item.name.toLowerCase();
                
                // Исключаем приборы
                if (lowerName.includes('прибор:') || 
                    lowerName.includes('вилка') || 
                    lowerName.includes('ложка') || 
                    lowerName.includes('палочки') || 
                    lowerName.includes('салфетки')) {
                    return false;
                }
                
                // Исключаем подарки (бесплатные товары)
                return !item.isFree;
            });
            
            // Определяем адрес доставки
            const deliveryAddress = paymentMethod === 'card' ? 'Самовывоз - Эстонская улица, 49А, Ростов-на-Дону' : address;
            const deliveryCost = paymentMethod === 'card' ? 0 : this.getDeliveryCost();
            
            // Рассчитываем скидку
            const discountInfo = this.calculateDiscount(cartTotal);
            const finalAmount = cartTotal + deliveryCost - discountInfo.amount;
            
            // Проверяем подарки
            const hasFreeRoll = cartData.some(item => item.isFree === true);
            
            // Получаем приборы и количество персон
            const utensilsData = window.deliveryCalculator ? window.deliveryCalculator.getUtensilsForOrder() : [];
            const persons = window.deliveryCalculator ? window.deliveryCalculator.persons : 1;
            
            console.log('🍽️ Приборы для бэкенда:', utensilsData);
            console.log('👥 Количество персон:', persons);
            console.log('💬 Комментарий клиента для бэкенда:', comment);
            
            const orderData = {
                customer_name: name,
                customer_phone: phone,
                customer_comment: comment,
                comment: comment,
                delivery_address: deliveryAddress,
                amount: finalAmount,
                original_amount: cartTotal + deliveryCost,
                delivery_cost: deliveryCost,
                discount_amount: discountInfo.amount,
                discount_percentage: discountInfo.hasDiscount ? discountInfo.percentage : 0,
                payment_method: paymentMethod,
                cart_items: filteredCartData,
                has_free_roll: hasFreeRoll,
                free_roll_product: hasFreeRoll ? "Ролл запечённый с лососем" : null,
                is_first_order: window.deliveryCalculator ? window.deliveryCalculator.isFirstOrder : false,
                utensils: utensilsData,
                utensils_count: utensilsData.length,
                persons: persons, // Добавляем количество персон
                timestamp: new Date().toISOString(),
                order_source: 'web_site'
            };
            
            console.log('📦 Данные для бэкенда:', {
                name: orderData.customer_name,
                phone: orderData.customer_phone,
                comment: orderData.comment,
                comment_length: orderData.comment ? orderData.comment.length : 0,
                persons: orderData.persons
            });
            return orderData;
            
        } catch (error) {
            console.error('❌ Ошибка получения данных заказа:', error);
            return null;
        }
    }

    calculateDiscount(orderTotal) {
        const paymentChecked = document.querySelector('input[name="payment"]:checked');
        const isCardPayment = paymentChecked && paymentChecked.value === 'card';
        
        if (isCardPayment && orderTotal > 0) {
            const discountAmount = Math.round(orderTotal * this.pickupDiscount);
            return {
                hasDiscount: true,
                amount: discountAmount,
                percentage: this.pickupDiscount * 100,
                originalTotal: orderTotal,
                discountedTotal: orderTotal - discountAmount
            };
        }
        
        return {
            hasDiscount: false,
            amount: 0,
            percentage: 0,
            originalTotal: orderTotal,
            discountedTotal: orderTotal
        };
    }

    validateForm(paymentMethod) {
        const phone = document.querySelector('input[name="phone"]')?.value || '';
        const name = document.querySelector('input[name="Name"]')?.value || '';
        
        if (!name || name.trim().length < 2) {
            this.showError('Введите ваше имя (минимум 2 символа)');
            return false;
        }
        
        const phoneDigits = phone.replace(/\D/g, '');
        if (!phone || phoneDigits.length < 10) {
            this.showError('Введите корректный номер телефона (минимум 10 цифр)');
            return false;
        }

        if (paymentMethod === 'sbp') {
            const address = document.querySelector('input[name="address"]')?.value || '';
            if (!address || address.trim().length < 5) {
                this.showError('Введите полный адрес доставки');
                return false;
            }
        }

        const cartTotal = window.cartManager ? window.cartManager.getTotalPrice() : 0;
        if (cartTotal <= 0) {
            this.showError('Корзина пуста');
            return false;
        }

        // Убираем проверку минимальной суммы
        return true;
    }

    getDeliveryCost() {
        if (window.deliveryCalculator) {
            const deliveryTotalElement = document.getElementById('delivery-total');
            if (deliveryTotalElement) {
                const deliveryText = deliveryTotalElement.textContent;
                if (deliveryText.includes('Бесплатно')) {
                    return 0;
                } else {
                    const match = deliveryText.match(/(\d+)\s*₽/);
                    return match ? parseInt(match[1]) : 0;
                }
            }
        }
        return 0;
    }

    handlePaymentMethodChange() {
        this.updateOrderButtonState();
        
        if (window.deliveryCalculator) {
            window.deliveryCalculator.updateDeliveryCostInUI();
        }
    }

    redirectToPayment(paymentUrl, orderId) {
        console.log('🔗 Перенаправление на страницу оплаты:', paymentUrl);
        localStorage.setItem('last_order_id', orderId);
        window.location.href = paymentUrl;
    }

    showLoading(show) {
        const orderBtn = document.querySelector('.order-btn');
        if (!orderBtn) return;
        
        if (show) {
            const originalText = orderBtn.textContent;
            orderBtn.textContent = 'Обработка...';
            orderBtn.disabled = true;
            orderBtn.dataset.originalText = originalText;
        } else {
            const originalText = orderBtn.dataset.originalText;
            if (originalText) {
                orderBtn.textContent = originalText;
            }
            orderBtn.disabled = false;
        }
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `payment-notification payment-notification-${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${icons[type]}</span>
                <span class="notification-text">${message}</span>
            </div>
        `;

        const styles = {
            success: { bg: '#d4edda', color: '#155724', border: '#c3e6cb' },
            error: { bg: '#f8d7da', color: '#721c24', border: '#f5c6cb' },
            warning: { bg: '#fff3cd', color: '#856404', border: '#ffeaa7' },
            info: { bg: '#d1ecf1', color: '#0c5460', border: '#bee5eb' }
        };

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${styles[type].bg};
            color: ${styles[type].color};
            padding: 15px 20px;
            border-radius: 8px;
            border: 1px solid ${styles[type].border};
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            animation: slideInRight 0.3s ease;
            font-family: "Montserrat", sans-serif;
            font-size: 14px;
            font-weight: 500;
        `;

        document.body.appendChild(notification);

        const duration = type === 'warning' ? 8000 : 5000;
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }
}

const deliveryStyles = `
.delivery-info {
    background: #f8f9fa;
    padding: 15px;
    border-radius: 8px;
    margin-bottom: 15px;
    border-left: 4px solid #B43F20;
    transition: all 0.3s ease;
}

.delivery-address {
    font-weight: 500;
    margin-bottom: 8px;
    color: #333;
    font-size: 14px;
}

.delivery-distance {
    font-size: 13px;
    margin-bottom: 6px;
    color: #666;
}

.delivery-price {
    font-size: 14px;
    font-weight: 500;
}

#delivery-total {
    font-weight: 500;
}

.delivery-loading {
    color: #666;
    font-style: italic;
}

.delivery-error {
    color: #dc3545;
    font-weight: 500;
}

.delivery-free {
    color: #28a745;
    font-weight: 600;
}

.free-roll-promo {
    background: #d4edda;
    border: 1px solid #c3e6cb;
    color: #155724;
    padding: 12px 15px;
    border-radius: 8px;
    margin: 10px 0;
    font-weight: 500;
    display: none;
}

.free-roll-progress {
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    color: #856404;
}

.free-roll-active {
    background: #d4edda;
    border: 1px solid #c3e6cb;
    color: #155724;
}

.free-roll-row {
    color: #28a745;
    font-weight: 600;
}

.discount-row {
    color: #28a745;
    font-weight: 600;
}

.order-btn[disabled] {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
}

.notification-content {
    display: flex;
    align-items: center;
    gap: 10px;
}

.notification-icon {
    font-size: 16px;
    flex-shrink: 0;
}

.notification-text {
    flex: 1;
}

@keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

@keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
}
`;

if (!document.querySelector('#delivery-styles')) {
    const styleElement = document.createElement('style');
    styleElement.id = 'delivery-styles';
    styleElement.textContent = deliveryStyles;
    document.head.appendChild(styleElement);
}

// Простой скрипт для проверки и создания счетчика персон
function checkAndCreatePersonsCounter() {
    if (!window.deliveryCalculator) {
        console.log('❌ DeliveryCalculator не загружен');
        return;
    }
    
    // Проверяем, существует ли уже счетчик
    const personsCounter = document.querySelector('.persons-selector-container');
    
    if (!personsCounter) {
        console.log('👥 Счетчик персон не найден, создаем...');
        window.deliveryCalculator.createPersonsSelector();
    } else {
        console.log('✅ Счетчик персон уже существует');
        // Обновляем UI если счетчик уже есть
        window.deliveryCalculator.updatePersonsUI();
    }
}

// Запускаем проверку после полной загрузки страницы
window.addEventListener('load', function() {
    setTimeout(() => {
        if (window.deliveryCalculator) {
            console.log('🚀 Запускаем инициализацию счетчика персон...');
            checkAndCreatePersonsCounter();
            
            // Периодически проверяем (на случай динамических изменений)
            setInterval(checkAndCreatePersonsCounter, 2000);
        } else {
            console.log('⚠️ DeliveryCalculator еще не доступен, пробуем позже...');
        }
    }, 500);
});

document.addEventListener('DOMContentLoaded', () => {
    window.deliveryCalculator = new DeliveryCalculator();
    window.paymentIntegration = new PaymentIntegration();
    console.log('🚀 Все системы инициализированы с поддержкой выбора персон');

    setTimeout(() => {
        if (window.deliveryCalculator) {
            window.deliveryCalculator.updateDeliveryCostInUI();
        }
        if (window.paymentIntegration) {
            window.paymentIntegration.updateOrderButtonState();
        }
    }, 1000);
});

// Патчинг CartManager для запрета добавления приборов в корзину
function patchCartManager() {
    if (!window.CartManager) {
        console.log('⚠️ CartManager не найден, откладываем патчинг');
        setTimeout(patchCartManager, 1000);
        return;
    }

    const originalAddToCart = CartManager.prototype.addToCart;
    
    CartManager.prototype.addToCart = function(productName, price, isFree = false) {
        
        const lowerName = productName.toLowerCase();
        if (lowerName.includes('прибор:') || 
            lowerName.includes('вилка') || 
            lowerName.includes('ложка') || 
            lowerName.includes('палочки') || 
            lowerName.includes('салфетки') ||
            lowerName.includes('билка') ||
            lowerName.includes('ломка')) {
            console.log('🚫 Запрещено добавлять приборы в корзину:', productName);
            return false;
        }
        
        if (isFree && this.getCartContents().some(item => item.name === productName && !item.isFree)) {
            this.removeFromCart(productName);
        }
        
        const result = originalAddToCart.call(this, productName, price);
        
        if (this.cart[productName]) {
            if (isFree) {
                this.cart[productName].isFree = true;
                this.cart[productName].originalPrice = price;
            }
        }
        
        return result;
    };

    const originalGetCartContents = CartManager.prototype.getCartContents;
    
    CartManager.prototype.getCartContents = function() {
        const contents = originalGetCartContents.call(this);
        return contents;
    };

    CartManager.prototype.isFreeItem = function(productName) {
        return this.cart[productName]?.isFree === true;
    };

    const originalUpdateCartDisplay = CartManager.prototype.updateCartDisplay;
    CartManager.prototype.updateCartDisplay = function() {
        originalUpdateCartDisplay.call(this);
        this.removeAllUtensilsFromCart();
        this.processSpecialItemsDisplay();
    };

    CartManager.prototype.removeAllUtensilsFromCart = function() {
        const utensilPatterns = [
            'Прибор: Вилка',
            'Прибор: Ложка', 
            'Прибор: Палочки',
            'Прибор: Салфетки',
            'Вилка',
            'Ложка',
            'Палочки',
            'Салфетки',
            'Прибор: Билка',
            'Прибор: Ломка',
            'Билка',  
            'Ломка'
        ];
        
        utensilPatterns.forEach(name => {
            if (this.cart[name]) {
                console.log('🗑️ Удаляем прибор из корзины по имени:', name);
                delete this.cart[name];
            }
        });
        
        for (const productName in this.cart) {
            const lowerName = productName.toLowerCase();
            if (lowerName.includes('прибор:') || 
                lowerName.includes('вилка') || 
                lowerName.includes('ложка') || 
                lowerName.includes('палочки') || 
                lowerName.includes('салфетки') ||
                lowerName.includes('билка') ||
                lowerName.includes('ломка')) {
                console.log('🗑️ Удаляем прибор из корзины по совпадению:', productName);
                delete this.cart[productName];
            }
        }
    };

    CartManager.prototype.processSpecialItemsDisplay = function() {
        const cartItems = document.querySelectorAll('.cart-item, .mini-cart-item');
        
        cartItems.forEach(item => {
            const nameElement = item.querySelector('.cart-item-name, .mini-cart-name');
            if (nameElement) {
                const productName = nameElement.textContent.trim();
                const cartItem = this.cart[productName];
                
                if (cartItem) {
                    if (cartItem.isFree) {
                        item.style.display = 'none';
                        item.classList.add('promo-item-hidden');
                    }
                }
                
                const lowerName = productName.toLowerCase();
                if (lowerName.includes('прибор:') || 
                    lowerName.includes('вилка') || 
                    lowerName.includes('ложка') || 
                    lowerName.includes('палочки') || 
                    lowerName.includes('салфетки') ||
                    lowerName.includes('билка') ||
                    lowerName.includes('ломка')) {
                    item.style.display = 'none';
                    item.classList.add('utensil-item-hidden');
                }
            }
        });
    };

    const originalGetTotalPrice = CartManager.prototype.getTotalPrice;
    CartManager.prototype.getTotalPrice = function() {
        let total = 0;
        
        for (const productName in this.cart) {
            const item = this.cart[productName];
            if (!item.isFree) {
                const lowerName = productName.toLowerCase();
                if (!lowerName.includes('прибор:') && 
                    !lowerName.includes('вилка') && 
                    !lowerName.includes('ложка') && 
                    !lowerName.includes('палочки') && 
                    !lowerName.includes('салфетки') &&
                    !lowerName.includes('билка') &&
                    !lowerName.includes('ломка')) {
                    total += item.price * item.quantity;
                }
            }
        }
        
        return total;
    };

    console.log('✅ CartManager успешно пропатчен - приборы НЕ добавляются в корзину');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', patchCartManager);
} else {
    patchCartManager();
}

function cleanupUtensilsOnLoad() {
    setTimeout(() => {
        if (window.deliveryCalculator && window.deliveryCalculator.cleanupUtensilsFromCart) {
            window.deliveryCalculator.cleanupUtensilsFromCart();
        }
    }, 1000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cleanupUtensilsOnLoad);
} else {
    cleanupUtensilsOnLoad();
}

if (typeof ymaps === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://api-maps.yandex.ru/2.1/?apikey=72339c42-07be-438f-b809-1ac0334f431f&lang=ru_RU';
    script.async = true;
    document.head.appendChild(script);

    script.onload = function() {
        console.log('✅ Yandex Maps API загружен');
        if (window.deliveryCalculator) {
            window.deliveryCalculator.initGeocoder();
        }
    };
}