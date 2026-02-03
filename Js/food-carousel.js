class FoodCategories {
    constructor() {
        this.container = document.querySelector('.food-categories-container');
        this.buttons = document.querySelectorAll('.food-categories-btn');
        this.activeButton = document.querySelector('.food-categories-btn.active-food');
        
        this.init();
    }
    
    init() {
        this.scrollToActiveButton();

        this.buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.setActiveButton(e.target);
                this.scrollToActiveButton();
            });
        });

        window.addEventListener('resize', () => {
            this.scrollToActiveButton();
        });
    }
    
    setActiveButton(button) {
        this.buttons.forEach(btn => btn.classList.remove('active-food'));
        button.classList.add('active-food');
        this.activeButton = button;
    }
    
    scrollToActiveButton() {
        if (!this.activeButton) return;
        
        const container = this.container;
        const button = this.activeButton;

        const containerRect = container.getBoundingClientRect();
        const buttonRect = button.getBoundingClientRect();
        const containerScrollLeft = container.scrollLeft;
        
        const buttonLeft = button.offsetLeft;
        const buttonWidth = button.offsetWidth;
        const containerWidth = container.clientWidth;

        let targetScroll = buttonLeft - (containerWidth - buttonWidth) / 2;

        targetScroll = Math.max(0, Math.min(targetScroll, container.scrollWidth - containerWidth));

        container.scrollTo({
            left: targetScroll,
            behavior: 'smooth'
        });
    }

    scrollToCategory(categoryName) {
        const button = Array.from(this.buttons).find(btn => 
            btn.textContent.trim() === categoryName
        );
        
        if (button) {
            this.setActiveButton(button);
            this.scrollToActiveButton();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const foodCategories = new FoodCategories();

    setTimeout(() => {
        foodCategories.scrollToActiveButton();
    }, 1000);

    window.foodCategories = foodCategories; 
});