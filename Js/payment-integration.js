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

    updateOrderButtonState() {
        const orderBtn = document.querySelector('.order-btn');
        if (!orderBtn) return;

        const cartTotal = window.cartManager ? window.cartManager.getTotalPrice() : 0;
        const isMinAmountReached = cartTotal >= this.minOrderAmount;

        if (isMinAmountReached) {
            orderBtn.disabled = false;
            orderBtn.style.opacity = '1';
            orderBtn.style.cursor = 'pointer';
            orderBtn.title = 'Оформить заказ';
            
            const originalText = orderBtn.getAttribute('data-original-text');
            if (originalText) {
                orderBtn.textContent = originalText;
            }
        } else {
            orderBtn.disabled = true;
            orderBtn.style.opacity = '0.6';
            orderBtn.style.cursor = 'not-allowed';
            
            if (!orderBtn.hasAttribute('data-original-text')) {
                orderBtn.setAttribute('data-original-text', orderBtn.textContent);
            }
            
            const remaining = this.minOrderAmount - cartTotal;
            orderBtn.textContent = `Минимум ${this.minOrderAmount} ₽`;
            orderBtn.title = `Добавьте товаров еще на ${remaining} ₽`;
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
            if (cartTotal < this.minOrderAmount) {
                this.showError(`Минимальная сумма заказа ${this.minOrderAmount} ₽. Добавьте товаров еще на ${this.minOrderAmount - cartTotal} ₽.`);
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

            // Помечаем заказ как выполненный перед отправкой
            if (window.deliveryCalculator) {
                window.deliveryCalculator.markOrderAsCompleted();
            }

            // 🔴 ИСПРАВЛЕНИЕ: Отправляем заказ в Telegram бот
            const orderData = this.getOrderData();
            console.log('📤 Отправляемые данные в Telegram бот:', orderData);
            
            try {
                // 🔴 ИСПРАВЛЕНИЕ: Используем DeliveryCalculator для отправки
                if (window.deliveryCalculator && window.deliveryCalculator.sendOrderToTelegramBot) {
                    const success = await window.deliveryCalculator.sendOrderToTelegramBot(orderData);
                    
                    if (success) {
                        this.showSuccess('✅ Заказ успешно отправлен! Проверьте Telegram.');
                        
                        // Очищаем корзину
                        if (window.cartManager) {
                            window.cartManager.clearCart();
                        }
                        
                        // Очищаем выбор приборов
                        if (window.deliveryCalculator) {
                            window.deliveryCalculator.utensils.forEach(utensil => {
                                utensil.defaultQty = 0;
                            });
                            window.deliveryCalculator.saveUtensilsToStorage();
                            window.deliveryCalculator.updateUtensilsCount();
                        }
                        
                        // 🔴 ИСПРАВЛЕНИЕ: Также отправляем в основной бэкенд для сохранения
                        try {
                            const mainBackendUrl = selectedPayment.value === 'card' ? 
                                'http://localhost:5007/api/create-pickup-order' : 
                                'http://localhost:5007/api/create-payment';
                            
                            const mainResponse = await fetch(mainBackendUrl, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify(orderData)
                            });
                            
                            if (mainResponse.ok) {
                                console.log('✅ Заказ также сохранен в основном бэкенде');
                            }
                        } catch (mainError) {
                            console.warn('⚠️ Не удалось сохранить в основном бэкенде:', mainError);
                        }
                        
                        setTimeout(() => {
                            window.location.href = '/Pages/index.html';
                        }, 3000);
                    } else {
                        this.showError('❌ Не удалось отправить заказ в Telegram');
                    }
                } else {
                    this.showError('❌ Ошибка системы: DeliveryCalculator не загружен');
                }
                
            } catch (error) {
                console.error('❌ Ошибка отправки в Telegram бот:', error);
                this.showError('❌ Ошибка отправки заказа');
            }

        } catch (error) {
            console.error('Payment processing error:', error);
            this.showError('Ошибка: ' + error.message);
        } finally {
            this.isProcessing = false;
            this.showLoading(false);
        }
    }

    async sendOrderToTelegramBot(paymentMethod) {
        console.log('🤖 Отправка заказа в Telegram бот');
        
        const orderData = this.getOrderData();
        
        // 🔴 ИСПРАВЛЕНИЕ: Добавляем правильные поля для Telegram бота
        const telegramOrderData = {
            order_id: orderData.order_id || `WEB${Date.now() % 1000000}`,
            customer_name: orderData.customer_name,
            customer_phone: orderData.customer_phone,
            comment: orderData.comment || orderData.customer_comment || '',
            customer_comment: orderData.customer_comment || orderData.comment || '',
            delivery_address: orderData.delivery_address,
            amount: orderData.amount,
            delivery_cost: orderData.delivery_cost,
            payment_method: orderData.payment_method,
            cart_items: orderData.cart_items,
            utensils: orderData.utensils || [],
            utensils_count: orderData.utensils_count || 0,
            has_free_roll: orderData.has_free_roll || false,
            free_roll_product: orderData.free_roll_product || "Ролл запечённый с лососем",
            has_first_order_gift: orderData.has_first_order_gift || false,
            first_order_gift: orderData.first_order_gift || "Моти",
            is_first_order: orderData.is_first_order || false,
            discount_amount: orderData.discount_amount || 0,
            discount_percentage: orderData.discount_percentage || 0,
            is_pickup: orderData.payment_method === 'card',
            timestamp: new Date().toISOString(),
            order_source: 'web_site'
        };
        
        console.log('📤 Данные для Telegram бота:', telegramOrderData);
        
        try {
            // 🔴 ИСПРАВЛЕНИЕ: Отправляем на порт Telegram бота (5001)
            const response = await fetch('http://localhost:5001/api/new-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(telegramOrderData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.showSuccess('✅ Заказ успешно отправлен в Telegram! Ожидайте готовности.');
                
                // Очищаем корзину
                if (window.cartManager) {
                    window.cartManager.clearCart();
                }
                
                // Очищаем выбор приборов
                if (window.deliveryCalculator) {
                    window.deliveryCalculator.utensils.forEach(utensil => {
                        utensil.defaultQty = 0;
                    });
                    window.deliveryCalculator.saveUtensilsToStorage();
                    window.deliveryCalculator.updateUtensilsCount();
                }
                
                // 🔴 ИСПРАВЛЕНИЕ: Также отправляем в основной бэкенд для сохранения
                await this.sendToMainBackend(orderData);
                
                setTimeout(() => {
                    window.location.href = '/Pages/index.html';
                }, 3000);
                
            } else {
                this.showError(result.error || 'Ошибка при отправке заказа в Telegram');
            }
        } catch (error) {
            console.error('Telegram bot order error:', error);
            // 🔴 ИСПРАВЛЕНИЕ: Попробуем отправить напрямую в основной бэкенд если Telegram бот недоступен
            this.showError('Telegram бот недоступен. Пробуем отправить напрямую...');
            await this.sendToMainBackend(orderData);
        }
    }

    async sendToMainBackend(orderData) {
        try {
            const endpoint = orderData.payment_method === 'card' ? 
                '/api/create-pickup-order' : '/api/create-payment';
            
            const response = await fetch(`http://localhost:5007${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderData)
            });

            if (response.ok) {
                console.log('✅ Заказ также отправлен в основной бэкенд');
            }
        } catch (error) {
            console.error('Ошибка отправки в основной бэкенд:', error);
        }
    }

    getOrderData() {
        const phone = document.querySelector('input[name="phone"]').value;
        const name = document.querySelector('input[name="Name"]').value || document.querySelector('input[name="name"]').value;
        const address = document.querySelector('input[name="address"]')?.value || '';
        const comment = document.querySelector('textarea[name="comment"]')?.value || '';
        const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
        
        const cartData = window.cartManager ? window.cartManager.getCartContents() : [];
        const cartTotal = window.cartManager ? window.cartManager.getTotalPrice() : 0;
        
        const deliveryAddress = paymentMethod === 'card' ? 'Самовывоз' : address;
        const deliveryCost = paymentMethod === 'card' ? 0 : this.getDeliveryCost();

        const discountInfo = this.calculateDiscount(cartTotal);
        const finalAmount = cartTotal + deliveryCost - discountInfo.amount;

        const hasFreeRoll = cartData.some(item => item.isFree === true);
        const hasFirstOrderGift = cartData.some(item => item.isFirstOrderGift === true);
        const isFirstOrder = window.deliveryCalculator ? window.deliveryCalculator.isFirstOrder : false;
        
        // 🔴 ИСПРАВЛЕНИЕ: Получаем информацию о приборах
        const utensilsData = window.deliveryCalculator ? window.deliveryCalculator.getUtensilsForOrder() : [];

        return {
            order_id: `ORDER_${Date.now()}`,
            customer_name: name,
            customer_phone: phone,
            customer_comment: comment,
            delivery_address: deliveryAddress,
            amount: finalAmount,
            original_amount: cartTotal + deliveryCost,
            delivery_cost: deliveryCost,
            discount_amount: discountInfo.amount,
            discount_percentage: discountInfo.hasDiscount ? discountInfo.percentage : 0,
            payment_method: paymentMethod,
            cart_items: cartData,
            comment: comment,
            has_free_roll: hasFreeRoll,
            free_roll_product: hasFreeRoll ? "Ролл запечённый с лососем" : null,
            has_first_order_gift: hasFirstOrderGift,
            first_order_gift: hasFirstOrderGift ? "Моти" : null,
            is_first_order: isFirstOrder,
            utensils: utensilsData,
            utensils_count: utensilsData.length,
            timestamp: new Date().toISOString(),
            order_source: 'web_site'
        };
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
        const phone = document.querySelector('input[name="phone"]').value;
        const nameInput = document.querySelector('input[name="Name"]') || document.querySelector('input[name="name"]');
        const name = nameInput ? nameInput.value : '';
        
        if (!name || name.trim().length < 2) {
            this.showError('Введите ваше имя (минимум 2 символа)');
            return false;
        }
        
        if (!phone || phone.replace(/\D/g, '').length < 10) {
            this.showError('Введите корректный номер телефона (минимум 10 цифр)');
            return false;
        }

        if (paymentMethod === 'sbp') {
            const address = document.querySelector('input[name="address"]').value;
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

        if (cartTotal < this.minOrderAmount) {
            this.showError(`Минимальная сумма заказа ${this.minOrderAmount} ₽. Добавьте товаров еще на ${this.minOrderAmount - cartTotal} ₽.`);
            return false;
        }

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
            const cartTotal = window.cartManager ? window.cartManager.getTotalPrice() : 0;
            if (cartTotal >= this.minOrderAmount) {
                orderBtn.disabled = false;
            }
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