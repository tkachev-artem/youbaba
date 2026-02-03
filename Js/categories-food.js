document.addEventListener('DOMContentLoaded', function() {
    const buttons = document.querySelectorAll('.food-categories-btn');
    const productContainer = document.querySelector('.product-container');
    const productCategories = document.querySelector('.product-categories-container');
    const originalContent = productCategories.innerHTML;
    const foodCategoriesBtnContainer = document.querySelector('.food-categories-btn-container');

    // Создаем компактный выбор подкатегорий
    const subcategories = [
        { name: 'Холодные', type: 'cold' },
        { name: 'Жаренные', type: 'fried' },
        { name: 'Запеченые', type: 'baked' }
    ];

    // Находим кнопку "Роллы"
    const rollsButton = Array.from(buttons).find(btn => btn.textContent.trim() === 'Роллы');
    
    if (rollsButton && foodCategoriesBtnContainer) {
        // Создаем компактный контейнер для подкатегорий
        const subcategoriesContainer = document.createElement('div');
        subcategoriesContainer.className = 'rolls-subcategories-container';
        subcategoriesContainer.style.cssText = `
            display: none;
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 4px;
            z-index: 1000;
            margin-top: 5px;
            min-width: auto;
            white-space: nowrap;
        `;

        // Создаем кнопки подкатегорий
        subcategories.forEach(sub => {
            const subBtn = document.createElement('button');
            subBtn.className = 'rolls-subcategory-btn';
            subBtn.textContent = sub.name;
            subBtn.dataset.type = sub.type;
            subBtn.style.cssText = `
                display: inline-block;
                padding: 6px 8px;
                margin: 2px;
                border: 1px solid #e0e0e0;
                border-radius: 6px;
                background: white;
                color: #333;
                font-family: inherit;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
                line-height: 1;
            `;
            
            subBtn.addEventListener('mouseenter', function() {
                if (!this.classList.contains('active-subcategory')) {
                    this.style.background = '#f8f9fa';
                    this.style.borderColor = '#007bff';
                }
            });
            
            subBtn.addEventListener('mouseleave', function() {
                if (!this.classList.contains('active-subcategory')) {
                    this.style.background = 'white';
                    this.style.borderColor = '#e0e0e0';
                }
            });
            
            subBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                const type = this.dataset.type;
                showRollsSubcategory(type);
                hideRollsSubcategories();
            });
            
            subcategoriesContainer.appendChild(subBtn);
        });

        // Создаем обертку для кнопки "Роллы"
        const rollsButtonWrapper = document.createElement('div');
        rollsButtonWrapper.className = 'rolls-button-wrapper';
        rollsButtonWrapper.style.cssText = `
            position: relative;
            display: inline-block;
        `;

        // Заменяем кнопку в DOM
        rollsButton.parentNode.insertBefore(rollsButtonWrapper, rollsButton);
        rollsButtonWrapper.appendChild(rollsButton);
        rollsButtonWrapper.appendChild(subcategoriesContainer);

        // Функции для показа/скрытия подкатегорий
        function showRollsSubcategories() {
            subcategoriesContainer.style.display = 'block';
        }

        function hideRollsSubcategories() {
            subcategoriesContainer.style.display = 'none';
        }

        // Обработчик для кнопки "Роллы"
        rollsButton.addEventListener('click', function(e) {
            e.stopPropagation();
            if (subcategoriesContainer.style.display === 'block') {
                hideRollsSubcategories();
            } else {
                showRollsSubcategories();
                showCategory('Роллы');
            }
        });

        // Закрываем при клике вне области
        document.addEventListener('click', function(e) {
            if (!rollsButtonWrapper.contains(e.target)) {
                hideRollsSubcategories();
            }
        });
    }

    const categoryMapping = {
        'Салаты': '.product-wrapper-title:first-child + .product-panel-container',
        'Лапша/рис': '.product-wrapper-title:nth-child(2) + .product-panel-container',
        'Закуски': '.product-wrapper-title:nth-child(3) + .product-panel-container',
        'Поке': '.product-wrapper-title:nth-child(4) + .product-panel-container',
        'Все товары': '.product-categories-container',
        'Роллы': '.product-wrapper-title:nth-child(5), .product-wrapper-title:nth-child(6), .product-wrapper-title:nth-child(7)',
        'Напитки': '.product-wrapper-title:nth-child(8) + .product-panel-container',
        'Десерты': '.product-wrapper-title:nth-child(9) + .product-panel-container',
        'Супы': '.product-wrapper-title:nth-child(10) + .product-panel-container',
        'Соусы': '.product-wrapper-title:nth-child(11) + .product-panel-container'
    };

    function showCategory(category) {
        buttons.forEach(btn => btn.classList.remove('active-food'));

        const activeButton = Array.from(buttons).find(btn => btn.textContent === category);
        if (activeButton) {
            activeButton.classList.add('active-food');
        }

        productCategories.style.opacity = '0';
        productCategories.style.transform = 'translateY(20px)';

        setTimeout(() => {
            productCategories.innerHTML = originalContent;
            
            if (category === 'Все товары') {
                showAllProducts();
            } else if (category === 'Роллы') {
                showRolls();
            } else {
                showSpecificCategory(category);
            }

            productCategories.style.opacity = '1';
            productCategories.style.transform = 'translateY(0)';

            animateProductItems();
        }, 300);
    }

    function showAllProducts() {
    }

    function showRolls() {
        const titles = productCategories.querySelectorAll('.product-wrapper-title');
        const panels = productCategories.querySelectorAll('.product-panel-container');
        
        let rollsHTML = '';

        titles.forEach((title, index) => {
            if (title.textContent.includes('Роллы')) {
                rollsHTML += `<h1 class="product-wrapper-title">${title.textContent}</h1>`;
                if (panels[index]) {
                    rollsHTML += panels[index].outerHTML;
                }
            }
        });

        productCategories.innerHTML = rollsHTML;
    }

    function showRollsSubcategory(type) {
        const titles = productCategories.querySelectorAll('.product-wrapper-title');
        const panels = productCategories.querySelectorAll('.product-panel-container');
        
        let subcategoryHTML = '';
        let found = false;

        titles.forEach((title, index) => {
            const titleText = title.textContent.toLowerCase();
            
            if (type === 'cold' && titleText.includes('холодные')) {
                subcategoryHTML += `<h1 class="product-wrapper-title">${title.textContent}</h1>`;
                if (panels[index]) {
                    subcategoryHTML += panels[index].outerHTML;
                }
                found = true;
            } else if (type === 'fried' && titleText.includes('жаренные')) {
                subcategoryHTML += `<h1 class="product-wrapper-title">${title.textContent}</h1>`;
                if (panels[index]) {
                    subcategoryHTML += panels[index].outerHTML;
                }
                found = true;
            } else if (type === 'baked' && titleText.includes('запеченые')) {
                subcategoryHTML += `<h1 class="product-wrapper-title">${title.textContent}</h1>`;
                if (panels[index]) {
                    subcategoryHTML += panels[index].outerHTML;
                }
                found = true;
            }
        });

        if (found) {
            productCategories.innerHTML = subcategoryHTML;
            
            // Подсвечиваем активную подкатегорию
            const subButtons = document.querySelectorAll('.rolls-subcategory-btn');
            subButtons.forEach(btn => {
                btn.classList.remove('active-subcategory');
                if (btn.dataset.type === type) {
                    btn.classList.add('active-subcategory');
                    btn.style.background = '#007bff';
                    btn.style.color = 'white';
                    btn.style.borderColor = '#007bff';
                } else {
                    btn.style.background = 'white';
                    btn.style.color = '#333';
                    btn.style.borderColor = '#e0e0e0';
                }
            });
        } else {
            showRolls();
        }

        animateProductItems();
    }

    function showSpecificCategory(category) {
        const titles = productCategories.querySelectorAll('.product-wrapper-title');
        const panels = productCategories.querySelectorAll('.product-panel-container');
        
        let categoryHTML = '';
        let found = false;

        titles.forEach((title, index) => {
            const titleText = title.textContent.toLowerCase();
            const searchCategory = category.toLowerCase();
            
            if (titleText.includes(searchCategory) || 
                (category === 'Лапша/рис' && titleText.includes('лапша')) ||
                (category === 'Соусы' && titleText.includes('соусы'))) {
                
                categoryHTML += `<h1 class="product-wrapper-title">${title.textContent}</h1>`;
                if (panels[index]) {
                    categoryHTML += panels[index].outerHTML;
                }
                found = true;
            }
        });

        if (found) {
            productCategories.innerHTML = categoryHTML;
        } else {
            productCategories.innerHTML = originalContent;
        }
    }

    function animateProductItems() {
        const productPanels = productCategories.querySelectorAll('.product-panel');
        productPanels.forEach((panel, index) => {
            panel.style.opacity = '0';
            panel.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                panel.style.transition = 'all 0.5s ease';
                panel.style.opacity = '1';
                panel.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }

    // Обработчики для остальных кнопок
    buttons.forEach(button => {
        if (button.textContent.trim() !== 'Роллы') {
            button.addEventListener('click', function() {
                const category = this.textContent;
                showCategory(category);
            });
        }
    });

    setTimeout(() => {
        animateProductItems();
    }, 500);

    const style = document.createElement('style');
    style.textContent = `
        .product-categories-container {
            transition: all 0.3s ease;
        }
        
        .product-panel {
            transition: all 0.3s ease;
        }
        
        .product-panel:hover {
            transform: translateY(-5px);
        }
        
        .food-categories-btn {
            transition: all 0.3s ease;
        }
        
        .food-categories-btn:hover {
            transform: translateY(-2px);
        }
        
        .rolls-button-wrapper {
            position: relative;
        }
        
        .rolls-subcategories-container {
            animation: fadeInDown 0.2s ease;
        }
        
        @keyframes fadeInDown {
            from {
                opacity: 0;
                transform: translateX(-50%) translateY(-5px);
            }
            to {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }
        }
        
        .rolls-subcategory-btn.active-subcategory {
            background: #007bff !important;
            color: white !important;
            border-color: #007bff !important;
        }
    `;
    document.head.appendChild(style);
});