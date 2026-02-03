class AddressSearch {
    constructor(jsonUrl = 'rostov_addresses.json') {
        this.searchInputs = document.querySelectorAll('.search-input');
        this.searchResults = null;
        this.searchBtn = document.querySelector('.search-btn');
        this.addresses = [];
        this.debounceTimer = null;
        this.selectedIndex = -1;
        this.jsonUrl = jsonUrl;
        this.storageKey = 'addressSearchValue';
        this.currentInput = null;
        this.isSyncing = false;

        this.init();
    }

    async init() {
        await this.loadAddresses();
        this.createResultsContainer();
        this.bindEvents();
        this.restoreState();
    }

    async loadAddresses() {
        try {
            const response = await fetch(this.jsonUrl);
            if (!response.ok) throw new Error('Ошибка загрузки JSON');
            this.addresses = await response.json();
            console.log(`✅ Загружено ${this.addresses.length} адресов из ${this.jsonUrl}`);
        } catch (error) {
            console.error('Ошибка при загрузке адресов:', error);
            this.addresses = [];
        }
    }

    createResultsContainer() {
        const oldContainer = document.querySelector('.search-results-container');
        if (oldContainer) {
            oldContainer.remove();
        }

        this.searchResults = document.createElement('div');
        this.searchResults.className = 'search-results-container';
        document.body.appendChild(this.searchResults);
    }

    bindEvents() {
        this.searchInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                this.currentInput = e.target;
                const value = e.target.value;

                if (!this.isSyncing) {
                    this.syncInputValues(value, e.target);
                }
                
                this.handleSearch(value);
                this.saveState(value);
            });

            input.addEventListener('keydown', (e) => {
                this.currentInput = e.target;
                this.handleKeyDown(e);
            });

            input.addEventListener('focus', (e) => {
                this.currentInput = e.target;
                if (input.value.length > 0) {
                    this.handleSearch(input.value);
                }
                this.positionResults(input);
            });

            input.addEventListener('blur', () => {
                setTimeout(() => this.hideResults(), 150);
            });

            input.addEventListener('click', (e) => {
                this.currentInput = e.target;
                this.positionResults(e.target);
            });

            this.setupInputValueInterceptor(input);
        });

        if (this.searchBtn) {
            this.searchBtn.addEventListener('click', () => {
                const activeInput = this.getActiveInput();
                if (activeInput) {
                    this.performSearch(activeInput.value);
                }
            });
        }

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-input') && 
                !e.target.closest('.search-results-container') &&
                !e.target.closest('.search-btn')) {
                this.hideResults();
            }
        });

        window.addEventListener('storage', (e) => {
            if (e.key === this.storageKey) {
                this.syncInputs(e.newValue);
            }
        });

        window.addEventListener('scroll', () => this.updateResultsPosition());
        window.addEventListener('resize', () => this.updateResultsPosition());
    }

    syncInputValues(value, sourceInput) {
        this.isSyncing = true;
        
        this.searchInputs.forEach(input => {
            if (input !== sourceInput && input.value !== value) {
                input.value = value;

                const event = new Event('input', { bubbles: true });
                input.dispatchEvent(event);
            }
        });

        setTimeout(() => {
            this.isSyncing = false;
        }, 10);
    }

    setupInputValueInterceptor(input) {
        const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
        
        if (originalDescriptor && originalDescriptor.set) {
            const originalSet = originalDescriptor.set;
            
            Object.defineProperty(input, 'value', {
                set: function(value) {
                    originalSet.call(this, value);
                    
                    if (!window.addressSearch?.isSyncing) {
                        setTimeout(() => {
                            if (window.addressSearch && this !== window.addressSearch.currentInput) {
                                window.addressSearch.syncInputValues(value, this);
                            }
                        }, 0);
                    }
                },
                get: originalDescriptor.get
            });
        }
    }

    positionResults(input) {
        if (!this.searchResults || !input) return;

        const rect = input.getBoundingClientRect();
        
        this.searchResults.style.position = 'fixed';
        this.searchResults.style.top = (rect.bottom + window.scrollY) + 'px';
        this.searchResults.style.left = (rect.left + window.scrollX) + 'px';
        this.searchResults.style.width = (rect.width) + 'px';
        this.searchResults.style.zIndex = '1000';
    }

    updateResultsPosition() {
        if (this.currentInput && this.searchResults.classList.contains('active')) {
            this.positionResults(this.currentInput);
        }
    }

    handleSearch(query) {
        clearTimeout(this.debounceTimer);

        if (query.length < 2) {
            this.hideResults();
            return;
        }

        this.debounceTimer = setTimeout(() => {
            this.searchAddresses(query);
        }, 300);
    }

    searchAddresses(query) {
        const searchTerms = query
            .toLowerCase()
            .trim()
            .split(/\s+/)
            .filter(term => term.length > 0);

        if (searchTerms.length === 0) {
            this.hideResults();
            return;
        }

        this.showLoading();

        setTimeout(() => {
            const results = this.addresses.filter(address => {
                const combinedText = `${address.street} ${address.district || ''} ${address.city || ''}`.toLowerCase();
                return searchTerms.every(term => combinedText.includes(term));
            });

            this.displayResults(results, searchTerms);
        }, 150);
    }

    displayResults(results, searchTerms) {
        if (!this.searchResults) return;
        
        this.searchResults.innerHTML = '';

        if (results.length === 0) {
            this.showNoResults();
            return;
        }

        const limitedResults = results.slice(0, 15);

        limitedResults.forEach((address) => {
            const resultItem = this.createResultItem(address, searchTerms);
            resultItem.addEventListener('click', () => {
                this.selectAddress(address);
            });
            this.searchResults.appendChild(resultItem);
        });

        this.showResults();
        this.selectedIndex = -1;
    }

    createResultItem(address, searchTerms) {
        const item = document.createElement('div');
        item.className = 'search-result-item';

        const highlightedStreet = this.highlightMultiple(address.street, searchTerms);
        const highlightedDistrict = this.highlightMultiple(address.district || '', searchTerms);
        const highlightedCity = this.highlightMultiple(address.city || '', searchTerms);

        item.innerHTML = `
            <div class="address">${highlightedStreet}</div>
            <div class="district">${highlightedDistrict} ${highlightedCity}</div>
        `;

        return item;
    }

    highlightMultiple(text, searchTerms) {
        if (!searchTerms || searchTerms.length === 0) return text;

        let result = text;
        for (const term of searchTerms) {
            const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi');
            result = result.replace(regex, '<mark class="highlight-red">$1</mark>');
        }
        return result;
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    showLoading() {
        if (!this.searchResults) return;
        this.searchResults.innerHTML = '<div class="loading">Поиск адресов...</div>';
        this.showResults();
    }

    showNoResults() {
        if (!this.searchResults) return;
        this.searchResults.innerHTML = '<div class="no-results">Адреса не найдены</div>';
        this.showResults();
    }

    showResults() {
        if (this.searchResults) {
            this.searchResults.classList.add('active');
            if (this.currentInput) {
                this.positionResults(this.currentInput);
            }
        }
    }

    hideResults() {
        if (this.searchResults) {
            this.searchResults.classList.remove('active');
        }
        this.selectedIndex = -1;
    }

    handleKeyDown(e) {
        if (!this.searchResults || !this.searchResults.classList.contains('active')) return;
        
        const items = this.searchResults.querySelectorAll('.search-result-item');
        if (!items.length) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, items.length - 1);
                this.updateSelection(items);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
                this.updateSelection(items);
                break;
            case 'Enter':
                e.preventDefault();
                if (this.selectedIndex >= 0) {
                    items[this.selectedIndex].click();
                } else {
                    this.performSearch(e.target.value);
                }
                break;
            case 'Escape':
                this.hideResults();
                break;
        }
    }

    updateSelection(items) {
        items.forEach((item, index) => {
            item.style.background = index === this.selectedIndex ? '#f0f0f0' : '';
        });
    }

    selectAddress(address) {
        if (!this.currentInput) return;

        const addressText = `${address.street}, ${address.district || ''}`.trim();

        this.searchInputs.forEach(input => {
            input.value = addressText;
        });
        
        this.saveState(addressText);
        this.hideResults();
        console.log('✅ Выбран адрес:', address);
        this.onAddressSelect(address);
    }

    performSearch(query) {
        if (query.trim().length > 0) {
            console.log('🔍 Поиск адреса:', query);
        }
    }

    saveState(value) {
        try {
            localStorage.setItem(this.storageKey, value);
        } catch (error) {
            console.error('Ошибка сохранения в localStorage:', error);
        }
    }

    restoreState() {
        try {
            const savedValue = localStorage.getItem(this.storageKey);
            if (savedValue) {
                this.searchInputs.forEach(input => {
                    input.value = savedValue;
                });
            }
        } catch (error) {
            console.error('Ошибка чтения из localStorage:', error);
        }
    }

    syncInputs(value) {
        this.searchInputs.forEach(input => {
            if (document.activeElement !== input) {
                input.value = value || '';
            }
        });
    }

    getActiveInput() {
        return Array.from(this.searchInputs).find(input => 
            document.activeElement === input
        ) || this.searchInputs[0];
    }

    onAddressSelect(address) {
        console.log('📍 Адрес выбран:', address);

        document.dispatchEvent(new CustomEvent('addressSelected', {
            detail: address
        }));
    }
}

const style = document.createElement('style');
style.textContent = `
    .highlight-red {
        background-color: transparent;
        color: inherit;
        text-decoration: underline;
        text-decoration-color: #ff4444;
        text-decoration-thickness: 2px;
        text-underline-offset: 2px;
    }
    
    .search-results-container {
        position: fixed;
        background: white;
        border: 1px solid #ddd;
        border-radius: 20px;
        margin-top: 15px;
        max-height: 200px;
        overflow-y: auto;
        width: 100%;
        z-index: 1000;
        display: none;
    }
    
    .search-results-container.active {
        display: block;
    }
    
    .search-result-item {
        padding: 8px 12px;
        cursor: pointer;
        border-bottom: 1px solid #eee;
    }
    
    .search-result-item:hover {
        background-color: #f5f5f5;
    }
    
    .loading, .no-results {
        padding: 8px 12px;
        color: #666;
        font-style: italic;
    }
`;
document.head.appendChild(style);

function initializeAddressSearch() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.addressSearch = new AddressSearch('/rostov_addresses.json');
            setupAddressSearchEvents();
        });
    } else {
        window.addressSearch = new AddressSearch('/rostov_addresses.json');
        setupAddressSearchEvents();
    }
}

function setupAddressSearchEvents() {
    if (window.addressSearch) {
        window.addressSearch.onAddressSelect = (address) => {
            console.log('Обработка выбранного адреса:', address);

            document.dispatchEvent(new CustomEvent('addressSelected', {
                detail: address
            }));
        };
    }
}

initializeAddressSearch();