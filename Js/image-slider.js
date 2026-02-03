class ImageSlider {
    constructor() {
        this.elements = {};
        this.currentIndex = 0;
        this.totalSlides = 1;
        this.autoSlideInterval = null;
        this.autoSlideDelay = 4000;
        this.isAnimating = false;
        this.slidesData = []; // Добавляем массив для хранения данных слайдов
        
        this.init();
    }
    
    init() {
        this.findElements();
        
        if (!this.validateElements()) {
            console.error('Не все необходимые элементы найдены в DOM');
            return;
        }
        
        // Собираем данные всех слайдов ДО того как начинаем их менять
        this.collectSlidesData();
        
        this.totalSlides = this.slidesData.length;
        
        // Устанавливаем общее количество слайдов
        this.elements.totalSlidesElement.textContent = this.totalSlides;
        this.elements.currentSlideElement.textContent = this.currentIndex + 1;
        
        // Предзагрузка изображений
        this.preloadImages();
        
        // Добавляем обработчики событий
        this.addEventListeners();
        
        // Запускаем автоматическую смену слайдов
        this.startAutoSlide();
        
        // Добавляем обработчики для свайпов
        this.setupTouchEvents();
        
        console.log('Слайдер инициализирован. Всего слайдов:', this.totalSlides);
    }
    
    findElements() {
        this.elements = {
            container: document.querySelector('.image-slider-container'),
            activeSlide: document.querySelector('.image-slider-active'),
            slides: document.querySelectorAll('.image-slider-item'),
            indicators: document.querySelectorAll('.indicator'),
            prevBtn: document.querySelector('.prev-btn'),
            nextBtn: document.querySelector('.next-btn'),
            currentSlideElement: document.querySelector('.image-slider-current-slide'),
            totalSlidesElement: document.querySelector('.image-slider-total-slides')
        };
    }
    
    // Новый метод: собираем данные всех слайдов
    collectSlidesData() {
        this.slidesData = [];
        
        // Собираем данные из активного слайда
        const activeImg = this.elements.activeSlide.querySelector('.image-slider-img');
        if (activeImg) {
            this.slidesData.push({
                src: activeImg.getAttribute('src'),
                alt: activeImg.getAttribute('alt') || 'Slide 1'
            });
        }
        
        // Собираем данные из обычных слайдов
        this.elements.slides.forEach((slide, index) => {
            const img = slide.querySelector('.image-slider-img');
            if (img) {
                this.slidesData.push({
                    src: img.getAttribute('src'),
                    alt: img.getAttribute('alt') || `Slide ${index + 2}`
                });
            }
        });
    }
    
    validateElements() {
        const requiredElements = [
            'container', 'activeSlide', 'slides', 'indicators',
            'prevBtn', 'nextBtn', 'currentSlideElement', 'totalSlidesElement'
        ];
        
        for (const elementName of requiredElements) {
            if (!this.elements[elementName]) {
                console.error(`Элемент не найден: ${elementName}`);
                return false;
            }
        }
        
        if (this.elements.slides.length === 0) {
            console.error('Не найдены слайды');
            return false;
        }
        
        if (this.elements.indicators.length === 0) {
            console.error('Не найдены индикаторы');
            return false;
        }
        
        return true;
    }
    
    preloadImages() {
        const images = document.querySelectorAll('.image-slider-img');
        images.forEach(img => {
            if (img.complete) {
                img.classList.add('loaded');
            } else {
                img.addEventListener('load', () => {
                    img.classList.add('loaded');
                });
                img.addEventListener('error', () => {
                    console.error('Ошибка загрузки изображения:', img.src);
                    img.alt = 'Изображение не загружено';
                });
            }
        });
    }
    
    addEventListeners() {
        // Кнопки навигации
        this.elements.prevBtn.addEventListener('click', () => this.prevSlide());
        this.elements.nextBtn.addEventListener('click', () => this.nextSlide());
        
        // Индикаторы
        this.elements.indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => this.goToSlide(index));
        });
        
        // Клавиатура
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // Пауза при наведении
        this.elements.container.addEventListener('mouseenter', () => this.stopAutoSlide());
        this.elements.container.addEventListener('mouseleave', () => this.startAutoSlide());
        
        // Видимость страницы
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stopAutoSlide();
            } else {
                this.startAutoSlide();
            }
        });
    }
    
    goToSlide(index) {
        if (this.isAnimating || index === this.currentIndex || index < 0 || index >= this.totalSlides) {
            return;
        }
        
        this.isAnimating = true;
        this.stopAutoSlide();
        
        // Обновляем текущий индекс
        this.currentIndex = index;
        
        // Обновляем активный слайд
        this.updateActiveSlide();
        
        // Обновляем индикаторы
        this.updateIndicators();
        
        // Обновляем счетчик
        this.updateCounter();
        
        // Перезапускаем автослайдер после анимации
        setTimeout(() => {
            this.isAnimating = false;
            this.startAutoSlide();
        }, 500);
    }
    
    // ИСПРАВЛЕННЫЙ МЕТОД: используем сохраненные данные вместо поиска в DOM
    updateActiveSlide() {
        const slideData = this.slidesData[this.currentIndex];
        if (!slideData) return;
        
        // Обновляем активный слайд
        this.elements.activeSlide.innerHTML = '';
        const img = document.createElement('img');
        img.src = slideData.src;
        img.alt = slideData.alt;
        img.className = 'image-slider-img';
        
        if (img.complete) {
            img.classList.add('loaded');
        } else {
            img.addEventListener('load', () => {
                img.classList.add('loaded');
            });
        }
        
        this.elements.activeSlide.appendChild(img);
    }
    
    nextSlide() {
        const nextIndex = (this.currentIndex + 1) % this.totalSlides;
        this.goToSlide(nextIndex);
    }
    
    prevSlide() {
        const prevIndex = (this.currentIndex - 1 + this.totalSlides) % this.totalSlides;
        this.goToSlide(prevIndex);
    }
    
    updateIndicators() {
        this.elements.indicators.forEach((indicator, index) => {
            indicator.classList.toggle('active', index === this.currentIndex);
        });
    }
    
    updateCounter() {
        this.elements.currentSlideElement.textContent = this.currentIndex + 1;
    }
    
    handleKeyPress(e) {
        if (this.isAnimating) return;
        
        switch(e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                this.prevSlide();
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.nextSlide();
                break;
            case 'Home':
                e.preventDefault();
                this.goToSlide(0);
                break;
            case 'End':
                e.preventDefault();
                this.goToSlide(this.totalSlides - 1);
                break;
            case ' ':
                e.preventDefault();
                this.toggleAutoSlide();
                break;
        }
    }
    
    startAutoSlide() {
        if (this.autoSlideInterval) return;
        
        this.autoSlideInterval = setInterval(() => {
            this.nextSlide();
        }, this.autoSlideDelay);
    }
    
    stopAutoSlide() {
        if (this.autoSlideInterval) {
            clearInterval(this.autoSlideInterval);
            this.autoSlideInterval = null;
        }
    }
    
    toggleAutoSlide() {
        if (this.autoSlideInterval) {
            this.stopAutoSlide();
        } else {
            this.startAutoSlide();
        }
    }
    
    setupTouchEvents() {
        let startX = 0;
        let endX = 0;
        
        this.elements.container.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
        }, { passive: true });
        
        this.elements.container.addEventListener('touchmove', (e) => {
            endX = e.touches[0].clientX;
        }, { passive: true });
        
        this.elements.container.addEventListener('touchend', () => {
            this.handleSwipe(startX, endX);
        }, { passive: true });
    }
    
    handleSwipe(startX, endX) {
        if (this.isAnimating) return;
        
        const swipeThreshold = 50;
        const diff = startX - endX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                this.nextSlide();
            } else {
                this.prevSlide();
            }
        }
    }
    
    destroy() {
        this.stopAutoSlide();
        
        if (this.elements.prevBtn) {
            this.elements.prevBtn.removeEventListener('click', () => this.prevSlide());
        }
        if (this.elements.nextBtn) {
            this.elements.nextBtn.removeEventListener('click', () => this.nextSlide());
        }
        
        this.elements.indicators.forEach((indicator, index) => {
            indicator.removeEventListener('click', () => this.goToSlide(index));
        });
        
        document.removeEventListener('keydown', (e) => this.handleKeyPress(e));
        this.elements.container.removeEventListener('mouseenter', () => this.stopAutoSlide());
        this.elements.container.removeEventListener('mouseleave', () => this.startAutoSlide());
        document.removeEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stopAutoSlide();
            } else {
                this.startAutoSlide();
            }
        });
        
        // Очищаем данные
        this.elements = {};
        this.slidesData = [];
    }
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        const slider = new ImageSlider();
        window.imageSlider = slider;
    } catch (error) {
        console.error('Ошибка инициализации слайдера:', error);
    }
});