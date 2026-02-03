document.addEventListener('DOMContentLoaded', function() {
    const burgerContainer = document.querySelector('.burger-container');
    const burgerMenu = document.querySelector('.burger-menu-container');
    const burgerLines = document.querySelectorAll('.burger-line');
    
    burgerMenu.style.display = 'none';
    burgerMenu.style.opacity = '0';
    burgerMenu.style.transform = 'scale(0.8)';
    
    let isMenuOpen = false;

    function openMenu() {
        burgerMenu.style.display = 'flex';
        
        setTimeout(() => {
            burgerMenu.style.opacity = '1';
            burgerMenu.style.transform = 'scale(1)';
            burgerMenu.style.transition = 'all 0.3s ease';
        }, 10);
        
        burgerLines[0].style.transform = 'rotate(45deg) translate(6px, 6px)';
        burgerLines[1].style.opacity = '0';
        burgerLines[2].style.transform = 'rotate(-45deg) translate(6px, -6px)';
        
        isMenuOpen = true;
    }

    function closeMenu() {
        burgerMenu.style.opacity = '0';
        burgerMenu.style.transform = 'scale(0.8)';

        burgerLines[0].style.transform = 'rotate(0) translate(0, 0)';
        burgerLines[1].style.opacity = '1';
        burgerLines[2].style.transform = 'rotate(0) translate(0, 0)';

        setTimeout(() => {
            burgerMenu.style.display = 'none';
        }, 300);
        
        isMenuOpen = false;
    }
    
    burgerContainer.addEventListener('click', function(event) {
        event.stopPropagation();
        if (!isMenuOpen) {
            openMenu();
        } else {
            closeMenu();
        }
    });

    const burgerLinks = burgerMenu.querySelectorAll('.burger-btn');
    burgerLinks.forEach(link => {
        link.addEventListener('click', function() {
            closeMenu();
        });
    });

    document.addEventListener('click', function(event) {
        if (isMenuOpen && 
            !burgerMenu.contains(event.target) && 
            !burgerContainer.contains(event.target)) {
            closeMenu();
        }
    });

    document.addEventListener('keydown', function(event) {
        if (isMenuOpen && event.key === 'Escape') {
            closeMenu();
        }
    });

    burgerMenu.addEventListener('click', function(event) {
        event.stopPropagation();
    });
});