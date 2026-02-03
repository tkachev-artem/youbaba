document.addEventListener('DOMContentLoaded', function() {
    const phoneInput = document.querySelector('input[name="phone"]');
    const nameInput = document.getElementById('name');
    const form = document.querySelector('.form');
    const addressInput = document.getElementById('address-input');
    const deliveryTotal = document.getElementById('delivery-total');
    const finalTotal = document.getElementById('final-total');

    // Устанавливаем черный цвет текста для имени
    nameInput.style.color = '#000000';

    // Валидация телефона
    phoneInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        
        if (value.startsWith('7') || value.startsWith('8')) {
            value = value.substring(1);
        }
        
        let formattedValue = '+7 (';
        
        if (value.length > 0) {
            formattedValue += value.substring(0, 3);
        }
        if (value.length > 3) {
            formattedValue += ') ' + value.substring(3, 6);
        }
        if (value.length > 6) {
            formattedValue += '-' + value.substring(6, 8);
        }
        if (value.length > 8) {
            formattedValue += '-' + value.substring(8, 10);
        }
        
        e.target.value = formattedValue;
    });

    // Валидация имени - только русские буквы
    nameInput.addEventListener('input', function(e) {
        let value = e.target.value;
        
        // Удаляем все символы, кроме русских букв и пробелов
        value = value.replace(/[^а-яёА-ЯЁ\s]/g, '');
        
        // Если поле не пустое, делаем первую букву заглавной
        if (value.length > 0) {
            // Разбиваем на слова (для случаев с ФИО)
            const words = value.split(' ');
            const capitalizedWords = words.map(word => {
                if (word.length > 0) {
                    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                }
                return word;
            });
            value = capitalizedWords.join(' ');
        }
        
        e.target.value = value;
        e.target.style.color = '#000000';
    });

    // Предотвращаем ввод недопустимых символов в поле имени
    nameInput.addEventListener('keydown', function(e) {
        // Разрешаем: Backspace, Delete, Tab, Escape, Enter
        if ([8, 46, 9, 27, 13].includes(e.keyCode) || 
            // Стрелки: влево, вправо, домой, конец
            (e.keyCode >= 35 && e.keyCode <= 39)) {
            return;
        }
        
        // Русские буквы и пробел
        if (!/^[а-яёА-ЯЁ\s]$/.test(e.key)) {
            e.preventDefault();
            return false;
        }
    });

    // Обработка отправки формы
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Валидация телефона
        const phoneValue = phoneInput.value.replace(/\D/g, '');
        if (phoneValue.length !== 11 || !phoneValue.startsWith('7')) {
            alert('Пожалуйста, введите корректный номер телефона');
            phoneInput.focus();
            phoneInput.style.borderColor = 'red';
            return false;
        }

        const phoneRegex = /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/;
        if (!phoneRegex.test(phoneInput.value)) {
            alert('Пожалуйста, введите номер в формате: +7 (XXX) XXX-XX-XX');
            phoneInput.focus();
            phoneInput.style.borderColor = 'red';
            return false;
        }

        // Валидация имени
        const nameValue = nameInput.value.trim();
        const nameRegex = /^[А-ЯЁ][а-яё]*(?:\s[А-ЯЁ][а-яё]*)*$/;
        
        if (!nameValue) {
            alert('Пожалуйста, введите имя');
            nameInput.focus();
            nameInput.style.borderColor = 'red';
            return false;
        }

        if (!nameRegex.test(nameValue)) {
            alert('Имя должно содержать только русские буквы и начинаться с заглавной буквы');
            nameInput.focus();
            nameInput.style.borderColor = 'red';
            return false;
        }

        if (nameValue.length < 2) {
            alert('Имя должно содержать минимум 2 буквы');
            nameInput.focus();
            nameInput.style.borderColor = 'red';
            return false;
        }

        // Валидация адреса для доставки
        const selectedPayment = document.querySelector('input[name="payment"]:checked').value;
        const isPickup = selectedPayment === 'card';
        
        if (!isPickup && !addressInput.value.trim()) {
            alert('Пожалуйста, введите адрес доставки');
            addressInput.focus();
            addressInput.style.borderColor = 'red';
            return false;
        }

        // Получаем данные корзины
        const cartItems = getCartItems();
        if (cartItems.length === 0) {
            alert('Корзина пуста');
            return false;
        }

        // Сбрасываем стили ошибок
        phoneInput.style.borderColor = '';
        nameInput.style.borderColor = '';
        addressInput.style.borderColor = '';

        // Подготавливаем данные для отправки
        const orderData = {
            customer_name: nameValue, // ✅ Правильное имя поля
            customer_phone: phoneInput.value,
            delivery_address: isPickup ? '' : addressInput.value.trim(),
            amount: parseFloat(finalTotal.textContent.replace('₽', '').trim()),
            delivery_cost: isPickup ? 0 : parseFloat(deliveryTotal.textContent.replace('₽', '').trim()),
            payment_method: selectedPayment,
            cart_items: cartItems,
            is_pickup: isPickup,
            comment: '' // Можно добавить поле для комментария
        };

        console.log('📤 Отправляемые данные:', orderData); // Для отладки

        try {
            // Показываем загрузку
            const orderBtn = document.querySelector('.order-btn');
            const originalText = orderBtn.textContent;
            orderBtn.textContent = 'Оформляем...';
            orderBtn.disabled = true;

            let response;
            if (isPickup) {
                // Самовывоз
                response = await fetch('http://localhost:5007/api/create-pickup-order', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(orderData)
                });
            } else {
                // Доставка
                response = await fetch('http://localhost:5007/api/create-payment', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(orderData)
                });
            }

            const result = await response.json();
            console.log('📥 Ответ от сервера:', result); // Для отладки

            if (result.success) {
                if (isPickup) {
                    alert('✅ Заказ на самовывоз успешно создан!');
                    clearCart();
                    window.location.href = '/Pages/index.html';
                } else {
                    // Для доставки - эмуляция платежа
                    alert('📱 Переход к оплате...');
                    // Здесь можно добавить редирект на платежную страницу
                    setTimeout(() => {
                        // Эмуляция успешной оплаты
                        confirmPayment(result.order_id);
                    }, 2000);
                }
            } else {
                alert('❌ Ошибка: ' + result.error);
            }

        } catch (error) {
            console.error('Ошибка при создании заказа:', error);
            alert('❌ Произошла ошибка при оформлении заказа');
        } finally {
            // Восстанавливаем кнопку
            orderBtn.textContent = originalText;
            orderBtn.disabled = false;
        }
    });

    // Функция подтверждения оплаты для доставки
    async function confirmPayment(orderId) {
        try {
            const response = await fetch(`/api/confirm-payment/${orderId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const result = await response.json();
            
            if (result.success) {
                alert('✅ Оплата прошла успешно! Заказ создан.');
                clearCart();
                window.location.href = '/Pages/index.html';
            } else {
                alert('❌ Ошибка подтверждения оплаты: ' + result.error);
            }
        } catch (error) {
            console.error('Ошибка подтверждения оплаты:', error);
            alert('❌ Ошибка подтверждения оплаты');
        }
    }

    // Валидация при потере фокуса для телефона
    phoneInput.addEventListener('blur', function() {
        const phoneValue = this.value.replace(/\D/g, '');
        
        if (phoneValue && (phoneValue.length !== 11 || !phoneValue.startsWith('7'))) {
            this.style.borderColor = 'red';
        } else {
            this.style.borderColor = '';
        }
    });

    phoneInput.addEventListener('focus', function() {
        this.style.borderColor = '';
    });

    // Валидация при потере фокуса для имени
    nameInput.addEventListener('blur', function() {
        const nameValue = this.value.trim();
        const nameRegex = /^[А-ЯЁ][а-яё]*(?:\s[А-ЯЁ][а-яё]*)*$/;
        
        if (nameValue && (!nameRegex.test(nameValue) || nameValue.length < 2)) {
            this.style.borderColor = 'red';
        } else {
            this.style.borderColor = '';
        }
        this.style.color = '#000000';
    });

    nameInput.addEventListener('focus', function() {
        this.style.borderColor = '';
        this.style.color = '#000000';
    });

    // Функция для получения данных о приборах
    function getUtensilsData() {
        if (window.deliveryCalculator && window.deliveryCalculator.getUtensilsForOrder) {
            const utensils = window.deliveryCalculator.getUtensilsForOrder();
            console.log('🍽️ Данные о приборах:', utensils);
            return utensils;
        }
        return [];
    }

    // Функция для получения комментария
    function getComment() {
        const commentTextarea = document.querySelector('textarea[name="comment"]');
        return commentTextarea ? commentTextarea.value.trim() : '';
    }

    // Функция для получения товаров из корзины
    function getCartItems() {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        return cart.map(item => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            isFree: item.isFree || false,
            isFirstOrderGift: item.isFirstOrderGift || false
        }));
    }

    // Функция очистки корзины
    function clearCart() {
        localStorage.removeItem('cart');
        updateCartCounter();
    }

    // Обновление счетчика корзины
    function updateCartCounter() {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const counters = document.querySelectorAll('.number');
        counters.forEach(counter => {
            counter.textContent = cart.reduce((total, item) => total + item.quantity, 0);
        });
    }
});