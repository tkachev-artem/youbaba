document.addEventListener('DOMContentLoaded', function() {
    const nameInput = document.getElementById('name');
    
    // Устанавливаем черный цвет текста для имени
    nameInput.style.color = '#000000';

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
        
        // Устанавливаем черный цвет текста
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

    // Валидация при отправке формы
    const form = nameInput.closest('form');
    form.addEventListener('submit', function(e) {
        const nameValue = nameInput.value.trim();
        const nameRegex = /^[А-ЯЁ][а-яё]*(?:\s[А-ЯЁ][а-яё]*)*$/;
        
        if (!nameValue) {
            e.preventDefault();
            alert('Пожалуйста, введите имя');
            nameInput.focus();
            nameInput.style.borderColor = 'red';
            nameInput.style.color = '#000000';
            return false;
        }

        if (!nameRegex.test(nameValue)) {
            e.preventDefault();
            alert('Имя должно содержать только русские буквы и начинаться с заглавной буквы');
            nameInput.focus();
            nameInput.style.borderColor = 'red';
            nameInput.style.color = '#000000';
            return false;
        }

        if (nameValue.length < 2) {
            e.preventDefault();
            alert('Имя должно содержать минимум 2 буквы');
            nameInput.focus();
            nameInput.style.borderColor = 'red';
            nameInput.style.color = '#000000';
            return false;
        }

        // Сбрасываем стиль ошибки если все валидно
        nameInput.style.borderColor = '';
        nameInput.style.color = '#000000';
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
        
        // Всегда черный цвет текста
        this.style.color = '#000000';
    });

    nameInput.addEventListener('focus', function() {
        this.style.borderColor = '';
        this.style.color = '#000000';
    });
});