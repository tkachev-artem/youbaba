document.addEventListener('DOMContentLoaded', () => {
    class PaymentSelector {
        constructor() {
            this.paymentToggle = document.getElementById('paymentToggle');
            this.paymentDropdown = document.getElementById('paymentDropdown');
            this.paymentOptions = document.querySelectorAll('.payment-radio');
            this.changeIcon = document.querySelector('.change-icon');
            this.addressInput = document.getElementById('address-input');
            this.addressLabel = document.querySelector('.arddress-title');
            this.deliveryRow = document.getElementById('total-order');
            this.deliveryTotal = document.getElementById('delivery-total');
            this.totalLabel = document.querySelector('.total-label');
            this.orderBtn = document.querySelector('.order-btn');
            this.finalTotal = document.getElementById('final-total');
            this.backendUrl = 'http://localhost:5007';

            this.init();
        }

        init() {
            if (!this.paymentToggle || !this.paymentDropdown) return;

            this.paymentToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown();
            });

            this.paymentOptions.forEach(option => {
                option.addEventListener('change', (e) => {
                    const value = e.target.value;
                    this.updateSelectedPayment(value);
                    this.closeDropdown();
                    this.updateOrderButton(value);
                });
            });

            document.addEventListener('click', (e) => {
                if (!this.paymentContainer.contains(e.target)) {
                    this.closeDropdown();
                }
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') this.closeDropdown();
            });

            this.initializeOrderButton();

            const checked = document.querySelector('input[name="payment"]:checked');
            if (checked) {
                this.updateSelectedPayment(checked.value);
                this.updateOrderButton(checked.value);
            }

            this.checkBackendConnection();
        }

        toggleDropdown() {
            this.paymentDropdown.classList.toggle('show');
            this.changeIcon.classList.toggle('rotated');
        }

        closeDropdown() {
            this.paymentDropdown.classList.remove('show');
            this.changeIcon.classList.remove('rotated');
        }

        updateSelectedPayment(value) {
            if (value === 'card') {
                this.hideAddressField();
                this.updateFinalTotal(0);
            } else {
                this.showAddressField();
                this.updateDeliveryCost();
            }
        }

        hideAddressField() {
            [this.addressInput, this.addressLabel, this.deliveryRow, this.deliveryTotal, this.totalLabel].forEach(el => {
                if (el) el.classList.add('hidden');
            });
            if (this.addressInput) {
                this.addressInput.disabled = true;
                this.addressInput.removeAttribute('required');
            }
        }

        showAddressField() {
            [this.addressInput, this.addressLabel, this.deliveryRow, this.deliveryTotal, this.totalLabel].forEach(el => {
                if (el) el.classList.remove('hidden');
            });
            if (this.addressInput) {
                this.addressInput.disabled = false;
                this.addressInput.setAttribute('required', 'true');
            }
        }

        updateOrderButton(paymentMethod) {
            if (!this.orderBtn) return;

            if (paymentMethod === 'card') {
                this.orderBtn.textContent = '✅ Оформить заказ (самовывоз)';
                this.orderBtn.style.backgroundColor = '#28a745';
            } else {
                this.orderBtn.textContent = '💳 Оплатить';
                this.orderBtn.style.backgroundColor = '#B43F20';
            }
        }

        initializeOrderButton() {
            if (!this.orderBtn) return;

            this.orderBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.processOrder();
            });
        }

        async checkBackendConnection() {
            try {
                console.log('🔗 Checking backend connection...');
                const response = await fetch(`${this.backendUrl}/api/test-connection`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ Backend connection successful:', result);
                    return true;
                } else {
                    console.warn('⚠️ Backend response not OK:', response.status);
                    return false;
                }
            } catch (error) {
                console.error('❌ Backend connection failed:', error);
                this.showWarning('Backend не запущен! Для тестирования заказы будут эмулироваться.');
                return false;
            }
        }

        async processOrder() {
            try {
                const selectedPayment = document.querySelector('input[name="payment"]:checked').value;
                
                if (!this.validateForm(selectedPayment)) {
                    return;
                }

                this.showLoading(true);

                const backendAvailable = await this.checkBackendConnection();

                if (selectedPayment === 'card') {
                    if (backendAvailable) {
                        await this.processPickupOrder();
                    } else {
                        await this.processPickupOrderFallback();
                    }
                } else {
                    if (backendAvailable) {
                        await this.processDeliveryPayment();
                    } else {
                        this.showError('Для заказов с доставкой требуется работающий backend');
                    }
                }

            } catch (error) {
                console.error('Order processing error:', error);
                this.showError('Неожиданная ошибка: ' + error.message);
            } finally {
                this.showLoading(false);
            }
        }

        async processPickupOrder() {
            console.log('🚶 Отправка заказа на самовывоз...');
            
            const orderData = this.getOrderData();
            
            try {
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
                    this.handleSuccess(result.order_id);
                } else {
                    this.showError(result.error || 'Ошибка при оформлении заказа');
                }
            } catch (error) {
                console.error('Pickup order API error:', error);
                await this.processPickupOrderFallback();
            }
        }

        async processPickupOrderFallback() {
            console.log('🔄 Использование fallback для самовывоза...');
            const orderData = this.getOrderData();

            const orderId = `pickup_${Date.now()}`;

            console.log('📦 Fallback заказ:', {
                orderId,
                ...orderData
            });
            
            this.handleSuccess(orderId);
        }

        async processDeliveryPayment() {
            console.log('🚗 Создание платежа для доставки...');
            
            const orderData = this.getOrderData();
            
            try {
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
                    // Перенаправляем на страницу оплаты Т-Банка
                    window.location.href = result.payment_url;
                } else {
                    this.showError(result.error || 'Ошибка при создании платежа');
                }
            } catch (error) {
                console.error('Delivery payment error:', error);
                this.showError('Ошибка при создании платежа: ' + error.message);
            }
        }

        getOrderData() {
            const phone = document.querySelector('input[name="phone"]').value;
            const address = document.querySelector('input[name="address"]')?.value || '';
            const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
            
            const cartData = window.cartManager ? window.cartManager.getCartContents() : [];
            const cartTotal = window.cartManager ? window.cartManager.getTotalPrice() : 0;
            
            const deliveryAddress = paymentMethod === 'card' ? 'Самовывоз' : address;
            const deliveryCost = paymentMethod === 'card' ? 0 : this.getDeliveryCost();

            return {
                customer_name: 'Клиент',
                customer_phone: phone,
                delivery_address: deliveryAddress,
                amount: cartTotal,
                delivery_cost: deliveryCost,
                payment_method: paymentMethod,
                cart_items: cartData,
                comment: ''
            };
        }

        validateForm(paymentMethod) {
            const phone = document.querySelector('input[name="phone"]').value;
            
            if (!phone || phone.replace(/\D/g, '').length < 10) {
                this.showError('Введите корректный номер телефона');
                return false;
            }

            if (paymentMethod === 'sbp') {
                const address = document.querySelector('input[name="address"]').value;
                if (!address) {
                    this.showError('Введите адрес доставки');
                    return false;
                }
            }

            const cartTotal = window.cartManager ? window.cartManager.getTotalPrice() : 0;
            if (cartTotal <= 0) {
                this.showError('Корзина пуста');
                return false;
            }

            return true;
        }

        getDeliveryCost() {
            if (!this.deliveryTotal) return 0;
            
            const text = this.deliveryTotal.textContent;
            if (text.includes('Бесплатно')) {
                return 0;
            }
            const match = text.match(/(\d+)/);
            return match ? parseInt(match[1]) : 0;
        }

        updateFinalTotal(deliveryCost = 0) {
            if (!this.finalTotal) return;
            
            const cartTotal = window.cartManager ? window.cartManager.getTotalPrice() : 0;
            const finalTotal = cartTotal + deliveryCost;
            
            this.finalTotal.textContent = `${finalTotal} ₽`;
        }

        updateDeliveryCost() {
            if (window.deliveryCalculator) {
                setTimeout(() => {
                    window.deliveryCalculator.updateDeliveryCostInUI();
                }, 100);
            }
        }

        handleSuccess(orderId) {
            this.showSuccess(`✅ Заказ #${orderId} успешно оформлен! Ожидайте готовности.`);

            if (window.cartManager) {
                window.cartManager.clearCart();
            }
            
            setTimeout(() => {
                window.location.href = '/Pages/index.html';
            }, 3000);
        }

        showLoading(show) {
            if (!this.orderBtn) return;
            
            if (show) {
                const originalText = this.orderBtn.textContent;
                this.orderBtn.textContent = 'Обработка...';
                this.orderBtn.disabled = true;
                this.orderBtn.dataset.originalText = originalText;
            } else {
                const originalText = this.orderBtn.dataset.originalText;
                if (originalText) {
                    this.orderBtn.textContent = originalText;
                }
                this.orderBtn.disabled = false;
            }
        }

        showError(message) {
            this.showNotification(message, 'error');
        }

        showSuccess(message) {
            this.showNotification(message, 'success');
        }

        showWarning(message) {
            this.showNotification(message, 'warning');
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
            `;

            document.body.appendChild(notification);

            setTimeout(() => {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, type === 'warning' ? 8000 : 5000);
        }

        get paymentContainer() {
            return this.paymentToggle.closest('.payment-container');
        }
    }

    const notificationStyles = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }

        .order-btn[disabled] {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .payment-notification {
            font-weight: 500;
        }

        .notification-content {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .notification-icon {
            font-size: 16px;
        }

        .notification-text {
            flex: 1;
        }
    `;

    if (!document.querySelector('#payment-selector-styles')) {
        const styleElement = document.createElement('style');
        styleElement.id = 'payment-selector-styles';
        styleElement.textContent = notificationStyles;
        document.head.appendChild(styleElement);
    }

    window.paymentSelector = new PaymentSelector();
    console.log('✅ Payment Selector initialized');
});