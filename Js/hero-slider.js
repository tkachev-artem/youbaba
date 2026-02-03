const slidesData = [
    {
        bgImage: '/Images/27daf6067b7793727c9185f9b8fbf01a_1765394980.png',
        hashtag: 'Супер!',
        title: 'Бессмертная классика',
        text: 'Том Ям. Филадельфия с лососем',
        mobileTitle: 'Бессмертная классика',
        mobileText: 'Том Ям. Филадельфия с лососем'
    },
    {
        bgImage: '/Images/d7ca9d44-aa21-4df2-a6b5-f4079c7a7013.jpg',
        hashtag: 'Качество!',
        title: 'Качество',
        text: 'Используем только свежую, охлажденную рыбу',
        mobileTitle: 'Качество',
        mobileText: 'Используем только свежую, охлажденную рыбу'
    },
    {
        bgImage: '/Images/d3a5d950-62c7-4eae-ad21-fc50cc3f5736.jpg',
        hashtag: 'Много!',
        title: 'Большие порции',
        text: '',
        mobileTitle: 'Большие порции',
        mobileText: ''
    },
    {
        bgImage: '/Images/f1c3434c187eaefafd20c2fd09928b38_1765384588.png',
        hashtag: 'Минимум!',
        title: 'Минимальный заказ от 1700р',
        text: '',
        mobileTitle: 'Минимальный заказ от 1700р',
        mobileText: ''
    },
    {
        bgImage: '/Images/1765401963504-t0k710cecnd.png',
        hashtag: 'Подарок!',
        title: 'Ролл в подарок!',
        text: 'При заказе от 2500р, ролл запеченый с лососем в подарок!',
        mobileTitle: 'Ролл в подарок!',
        mobileText: 'При заказе от 2500р, ролл запеченый с лососем в подарок!'
    },
    {
        bgImage: '/Images/ebc994a0-505d-45ee-8c3d-d41aa0132661.jpg',
        hashtag: 'Снеки!',
        title: 'Азиатские снеки',
        text: 'В магазине предоставлен ассортимент азиантских снеков! Филимоновская 18',
        mobileTitle: 'Азиатские снеки',
        mobileText: 'В магазине предоставлен ассортимент азиантских снеков! Филимоновская 18'
    },
    {
        bgImage: '/Images/bg-hero.jpg',
        hashtag: 'Магия!',
        title: 'Попробуй магию на вкус!',
        text: '',
        mobileTitle: 'Попробуй магию на вкус!',
        mobileText: ''
    },
];

class HeroSlider {
    constructor() {
        this.slides = slidesData;
        this.currentSlide = 0;
        this.isAnimating = false;
        this.animationDuration = 600;
        this.autoPlayInterval = 5000;
        this.autoPlayTimer = null;
        this.isMobile = window.innerWidth <= 768;

        this.bgElement = document.querySelector('.hero-bg');
        this.hashtagElement = document.querySelector('.hero-heshtag');
        this.titleElement = document.querySelector('.hero-title');
        this.textElement = document.querySelector('.hero-text');

        this.createBackgroundLayers();
        
        this.init();
        this.bindResize();
    }
    
    createBackgroundLayers() {
        this.bgElement.style.backgroundImage = 'none';
        this.bgElement.style.position = 'relative';
        this.bgElement.style.overflow = 'hidden';
        
        this.bgElement.innerHTML = `
            <div class="bg-layer bg-current" style="background-image: url('${this.slides[0].bgImage}')"></div>
            <div class="bg-layer bg-next"></div>
        `;

        this.addBackgroundStyles();

        this.bgCurrent = this.bgElement.querySelector('.bg-current');
        this.bgNext = this.bgElement.querySelector('.bg-next');
    }
    
    addBackgroundStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .bg-layer {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-size: cover;
                background-position: center;
                transition: opacity ${this.animationDuration}ms ease;
                filter: brightness(0.8); /* Затемнение изображения */
            }
            
            .bg-current {
                opacity: 1;
                z-index: 2;
            }
            
            .bg-next {
                opacity: 0;
                z-index: 1;
            }
            
            .bg-current.fade-out {
                opacity: 0;
            }
            
            .bg-next.fade-in {
                opacity: 1;
            }
        `;
        document.head.appendChild(style);
    }
    
    init() {
        this.bindEvents();
        this.preloadImages();
        this.startAutoPlay();
        this.preventTextCentering();
    }
    
    preloadImages() {
        this.slides.forEach(slide => {
            const img = new Image();
            img.onerror = () => {
                console.warn(`Изображение не найдено: ${slide.bgImage}`);
                slide.bgImage = '/Images/hero-bg.png';
            };
            img.src = slide.bgImage;
        });
    }
    
    bindEvents() {
        const leftBtn = document.querySelector('.hero-nav-btn:not(#right-arrow)');
        const rightBtn = document.querySelector('#right-arrow');
        
        if (leftBtn && rightBtn) {
            leftBtn.addEventListener('click', () => {
                this.stopAutoPlay();
                this.prevSlide();
                this.startAutoPlay();
            });
            rightBtn.addEventListener('click', () => {
                this.stopAutoPlay();
                this.nextSlide();
                this.startAutoPlay();
            });
            
            document.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowLeft') {
                    this.stopAutoPlay();
                    this.prevSlide();
                    this.startAutoPlay();
                }
                if (e.key === 'ArrowRight') {
                    this.stopAutoPlay();
                    this.nextSlide();
                    this.startAutoPlay();
                }
            });

            this.bgElement.addEventListener('mouseenter', () => {
                this.stopAutoPlay();
            });

            this.bgElement.addEventListener('mouseleave', () => {
                this.startAutoPlay();
            });
        } else {
            console.error('Кнопки навигации не найдены');
        }
    }

    bindResize() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const wasMobile = this.isMobile;
                this.isMobile = window.innerWidth <= 768;

                if (wasMobile !== this.isMobile) {
                    const currentData = this.slides[this.currentSlide];
                    this.updateContent(currentData);
                }
                
                this.adjustTitleFontSize();
                this.adjustTextContent();
                this.preventTextCentering();
            }, 250);
        });
    }

    preventTextCentering() {
        const elements = [this.hashtagElement, this.titleElement, this.textElement];
        
        elements.forEach(element => {
            if (element) {
                element.style.textAlign = 'left';
                element.style.marginLeft = '0';
                element.style.marginRight = 'auto';

                element.style.display = 'block';
                element.style.justifyContent = 'flex-start';
                element.style.alignItems = 'flex-start';
            }
        });

        const heroContent = document.querySelector('.hero-content');
        const heroContainer = document.querySelector('.hero-container');
        
        if (heroContent) {
            heroContent.style.display = 'block';
            heroContent.style.textAlign = 'left';
            heroContent.style.alignItems = 'flex-start';
            heroContent.style.justifyContent = 'flex-start';
        }
        
        if (heroContainer) {
            heroContainer.style.display = 'block';
            heroContainer.style.textAlign = 'left';
            heroContainer.style.alignItems = 'flex-start';
            heroContainer.style.justifyContent = 'flex-start';
        }
    }

    startAutoPlay() {
        this.stopAutoPlay();

        this.autoPlayTimer = setInterval(() => {
            this.nextSlide();
        }, this.autoPlayInterval);
    }

    stopAutoPlay() {
        if (this.autoPlayTimer) {
            clearInterval(this.autoPlayTimer);
            this.autoPlayTimer = null;
        }
    }
    
    nextSlide() {
        if (this.isAnimating) return;
        
        this.currentSlide = (this.currentSlide + 1) % this.slides.length;
        this.animateTransition('next');
    }
    
    prevSlide() {
        if (this.isAnimating) return;
        
        this.currentSlide = this.currentSlide === 0 ? 
            this.slides.length - 1 : this.currentSlide - 1;
        this.animateTransition('prev');
    }
    
    animateTransition(direction) {
        this.isAnimating = true;
        
        const currentData = this.slides[this.currentSlide];
        
        this.hideText().then(() => {
            this.changeBackground(currentData.bgImage).then(() => {
                this.updateContent(currentData);
                this.showText().then(() => {
                    this.isAnimating = false;
                    this.preventTextCentering();
                });
            });
        });
    }
    
    hideText() {
        return new Promise((resolve) => {
            const elements = [
                this.hashtagElement, 
                this.titleElement, 
                this.textElement
            ];

            elements.forEach((element) => {
                if (element) {
                    element.style.transition = `all ${this.animationDuration/2}ms ease`;
                    element.style.opacity = '0';
                    element.style.transform = 'scale(0.95)';
                }
            });
            
            setTimeout(resolve, this.animationDuration/2);
        });
    }
    
    changeBackground(bgImage) {
        return new Promise((resolve) => {
            this.bgNext.style.backgroundImage = `url('${bgImage}')`;

            this.bgCurrent.classList.add('fade-out');
            this.bgNext.classList.add('fade-in');

            setTimeout(() => {
                this.resetBackgroundLayers();
                resolve();
            }, this.animationDuration);
        });
    }
    
    showText() {
        return new Promise((resolve) => {
            const elements = [
                this.hashtagElement, 
                this.titleElement, 
                this.textElement
            ];

            elements.forEach(element => {
                if (element) {
                    element.style.opacity = '0';
                    element.style.transform = 'scale(0.95)';
                }
            });

            setTimeout(() => {
                elements.forEach((element, index) => {
                    if (element) {
                        setTimeout(() => {
                            element.style.transition = `all ${this.animationDuration}ms ease`;
                            element.style.opacity = '1';
                            element.style.transform = 'scale(1)';
                        }, index * 100);
                    }
                });
                
                setTimeout(resolve, this.animationDuration + 300);
            }, 100);
        });
    }
    
    resetBackgroundLayers() {
        const temp = this.bgCurrent;
        this.bgCurrent = this.bgNext;
        this.bgNext = temp;

        this.bgCurrent.className = 'bg-layer bg-current';
        this.bgCurrent.style.opacity = '1';
        
        this.bgNext.className = 'bg-layer bg-next';
        this.bgNext.style.opacity = '0';
        
        this.bgCurrent.classList.remove('fade-out');
        this.bgNext.classList.remove('fade-in');
    }
    
    updateContent(data) {
        if (this.hashtagElement) this.hashtagElement.textContent = data.hashtag;
        
        if (this.titleElement) {
            this.titleElement.textContent = this.isMobile && data.mobileTitle 
                ? data.mobileTitle 
                : data.title;
        }
        
        if (this.textElement) {
            this.textElement.textContent = this.isMobile && data.mobileText 
                ? data.mobileText 
                : data.text;
        }

        this.adjustTitleFontSize();
        this.adjustTextContent();
    }

    adjustTitleFontSize() {
        if (!this.titleElement) return;

        const title = this.titleElement;
        const textLength = title.textContent.length;

        let newFontSize;
        
        if (window.innerWidth <= 480) {
            if (textLength > 40) newFontSize = 24;
            else if (textLength > 30) newFontSize = 28;
            else if (textLength > 20) newFontSize = 32;
            else newFontSize = 36;
        } else if (window.innerWidth <= 768) {
            if (textLength > 50) newFontSize = 32;
            else if (textLength > 40) newFontSize = 36;
            else if (textLength > 30) newFontSize = 40;
            else newFontSize = 44;
        } else {
            if (textLength > 60) newFontSize = 42;
            else if (textLength > 50) newFontSize = 46;
            else if (textLength > 40) newFontSize = 48;
            else newFontSize = 52;
        }

        title.style.fontSize = `${newFontSize}px`;
        title.style.lineHeight = `${newFontSize * 1.1}px`;
    }

    adjustTextContent() {
        if (!this.textElement) return;

        const text = this.textElement;

        text.style.maxWidth = window.innerWidth <= 768 ? '320px' : '420px';
    }
    
    goToSlide(index) {
        if (this.isAnimating || index < 0 || index >= this.slides.length) return;
        
        const direction = index > this.currentSlide ? 'next' : 'prev';
        this.currentSlide = index;
        this.animateTransition(direction);
    }

    destroy() {
        this.stopAutoPlay();
    }
}

const responsiveStyles = `
/* Затемнение фоновых изображений */
.bg-layer {
    filter: brightness(0.8); /* Затемнение 20% */
}

/* Усиление затемнения на мобильных устройствах */
@media (max-width: 768px) {
    .bg-layer {
        filter: brightness(0.7); /* Усиленное затемнение 30% на мобильных */
    }
}

@media (max-width: 1200px) {
    .hero-title {
        font-size: 42px !important;
        line-height: 46px !important;
    }
}

@media (max-width: 992px) {
    .hero-title {
        font-size: 36px !important;
        line-height: 40px !important;
        max-width: 500px !important;
    }
    
    .hero-text {
        font-size: 16px !important;
        max-width: 350px !important;
    }
}

@media (max-width: 768px) {
    .hero-container {
        margin-top: 150px !important;
        padding: 0 20px;
    }
    
    .hero-title {
        font-size: 28px !important;
        line-height: 32px !important;
        max-width: 100% !important;
        text-align: left !important;
        color: #ffffff !important;
        text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.5) !important;
    }
    
    .hero-text {
        font-size: 14px !important;
        max-width: 280px !important;
        margin: 10px 0 0 0 !important;
        text-align: left !important;
        color: #f0f0f0 !important;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3) !important;
    }
    
    .hero-heshtag {
        font-size: 14px !important;
        padding: 10px 16px !important;
        text-align: left !important;
        margin-left: 0 !important;
        background-color: rgba(255, 255, 255, 0.9) !important;
    }
    
    .hero-content {
        display: block !important;
        text-align: left !important;
        align-items: flex-start !important;
        justify-content: flex-start !important;
    }

    .hero-container {
        display: block !important;
        text-align: left !important;
        align-items: flex-start !important;
        justify-content: flex-start !important;
    }
}

@media (max-width: 480px) {
    .hero-title {
        font-size: 24px !important;
        line-height: 28px !important;
        padding: 0 !important;
        text-align: left !important;
        color: #ffffff !important;
        text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.6) !important;
    }
    
    .hero-text {
        font-size: 13px !important;
        max-width: 250px !important;
        padding: 0 !important;
        text-align: left !important;
        color: #f0f0f0 !important;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.4) !important;
    }
    
    .hero-heshtag {
        font-size: 12px !important;
        padding: 8px 14px !important;
        text-align: left !important;
        background-color: rgba(255, 255, 255, 0.9) !important;
    }
}

/* Улучшение читаемости текста на затемненных изображениях */
.hero-title {
    word-wrap: break-word;
    overflow-wrap: break-word;
    hyphens: auto;
    text-align: left !important;
    color: #ffffff !important;
    text-shadow: 1px 1px 4px rgba(0, 0, 0, 0.4) !important;
}

.hero-text {
    word-wrap: break-word;
    overflow-wrap: break-word;
    text-align: left !important;
    color: #f0f0f0 !important;
    text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.3) !important;
}

.hero-heshtag {
    text-align: left !important;
    background-color: #B43F20 !important;
    color: #fff !important;
    border-radius: 50px;
    padding: 8px 16px;
    display: inline-block;
}

.hero-content {
    text-align: left !important;
    align-items: flex-start !important;
    justify-content: flex-start !important;
    position: relative;
    z-index: 2;
}

.hero-container {
    text-align: left !important;
    align-items: flex-start !important;
    justify-content: flex-start !important;
    position: relative;
    z-index: 2;
}
`;

document.addEventListener('DOMContentLoaded', () => {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = responsiveStyles;
    document.head.appendChild(styleSheet);
    
    const requiredElements = [
        '.hero-bg',
        '.hero-heshtag', 
        '.hero-title', 
        '.hero-text',
        '.hero-nav-btn'
    ];
    
    const allElementsExist = requiredElements.every(selector => {
        const element = document.querySelector(selector);
        if (!element) {
            console.error(`Элемент не найден: ${selector}`);
            return false;
        }
        return true;
    });
    
    if (allElementsExist) {
        const slider = new HeroSlider();
        console.log('Слайдер успешно инициализирован с затемненными изображениями');

        setTimeout(() => {
            slider.adjustTitleFontSize();
            slider.adjustTextContent();
            slider.preventTextCentering();
        }, 100);

        window.addEventListener('beforeunload', () => {
            slider.destroy();
        });
    } else {
        console.error('Не все необходимые элементы найдены для инициализации слайдера');
    }
}); 