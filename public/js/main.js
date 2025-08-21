// Language Management
class LanguageManager {
    constructor() {
        this.currentLang = localStorage.getItem('language') || 'en';
        this.init();
    }

    init() {
        this.setLanguage(this.currentLang);
        this.bindEvents();
    }

    bindEvents() {
        const toggleBtn = document.getElementById('languageToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.toggleLanguage();
            });
        }
    }

    setLanguage(lang) {
        this.currentLang = lang;
        localStorage.setItem('language', lang);
        
        // Update HTML direction
        document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
        document.documentElement.setAttribute('lang', lang);
        
        // Update all translatable elements
        const elements = document.querySelectorAll('[data-en][data-ar]');
        elements.forEach(element => {
            const text = element.getAttribute(`data-${lang}`);
            if (text) {
                element.textContent = text;
            }
        });
        
        // Update language toggle button
        const langToggle = document.getElementById('currentLang');
        if (langToggle) {
            langToggle.textContent = lang.toUpperCase();
        }
        
        // Update form placeholders
        this.updatePlaceholders(lang);
        
        // Update Bootstrap classes for RTL
        if (lang === 'ar') {
            document.body.classList.add('rtl');
        } else {
            document.body.classList.remove('rtl');
        }
    }

    updatePlaceholders(lang) {
        const placeholders = {
            en: {
                search: 'Search products...',
                email: 'Enter your email',
                password: 'Enter your password',
                firstName: 'First name',
                lastName: 'Last name',
                phone: 'Phone number',
                address: 'Delivery address',
                review: 'Share your experience with this product...'
            },
            ar: {
                search: 'البحث عن المنتجات...',
                email: 'أدخل بريدك الإلكتروني',
                password: 'أدخل كلمة المرور',
                firstName: 'الاسم الأول',
                lastName: 'الاسم الأخير',
                phone: 'رقم الهاتف',
                address: 'عنوان التسليم',
                review: 'شارك تجربتك مع هذا المنتج...'
            }
        };

        Object.keys(placeholders[lang]).forEach(key => {
            const element = document.querySelector(`[data-placeholder="${key}"]`);
            if (element) {
                element.placeholder = placeholders[lang][key];
            }
        });
    }

    toggleLanguage() {
        const newLang = this.currentLang === 'en' ? 'ar' : 'en';
        this.setLanguage(newLang);
    }

    getCurrentLanguage() {
        return this.currentLang;
    }
}

// Utility Functions
class Utils {
    static formatPrice(price, currency = 'EGP') {
        const lang = window.languageManager?.getCurrentLanguage() || 'en';

        // Format price with LE suffix instead of currency formatting
        const formattedNumber = parseFloat(price).toFixed(2);
        return `${formattedNumber} LE`;
    }

    static formatDate(date, options = {}) {
        const lang = window.languageManager?.getCurrentLanguage() || 'en';
        const locale = lang === 'ar' ? 'ar-SA' : 'en-US';
        
        const defaultOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            ...options
        };
        
        return new Intl.DateTimeFormat(locale, defaultOptions).format(new Date(date));
    }

    static showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

        // Add to toast container or create one
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container position-fixed top-0 end-0 p-3';
            container.style.zIndex = '1055';
            document.body.appendChild(container);
        }

        container.appendChild(toast);

        // Initialize and show toast
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();

        // Remove toast element after it's hidden
        toast.addEventListener('hidden.bs.toast', () => {
            toast.remove();
        });
    }

    static async makeRequest(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, defaultOptions);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('Request error:', error);
            throw error;
        }
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// Form Validation
class FormValidator {
    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    static validatePhone(phone) {
        const re = /^[\+]?[1-9][\d]{0,15}$/;
        return re.test(phone.replace(/\s/g, ''));
    }

    static validatePassword(password) {
        return password.length >= 6;
    }

    static validateEnglishOnly(text) {
        // Only allow English letters, numbers, and common symbols
        const englishOnlyRegex = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~\s]*$/;
        return englishOnlyRegex.test(text);
    }

    static validateRequired(value) {
        return value && value.trim().length > 0;
    }

    static addValidationToForm(form) {
        form.addEventListener('submit', function(event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        });

        // Real-time validation
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', function() {
                if (input.checkValidity()) {
                    input.classList.remove('is-invalid');
                    input.classList.add('is-valid');
                } else {
                    input.classList.remove('is-valid');
                    input.classList.add('is-invalid');
                }
            });
        });
    }
}

// Loading States
class LoadingManager {
    static showLoading(element, text = 'Loading...') {
        element.disabled = true;
        element.classList.add('loading');
        
        const originalText = element.innerHTML;
        element.setAttribute('data-original-text', originalText);
        
        element.innerHTML = `
            <span class="spinner me-2"></span>
            ${text}
        `;
    }

    static hideLoading(element) {
        element.disabled = false;
        element.classList.remove('loading');
        
        const originalText = element.getAttribute('data-original-text');
        if (originalText) {
            element.innerHTML = originalText;
            element.removeAttribute('data-original-text');
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize language manager
    window.languageManager = new LanguageManager();
    
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Initialize popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
    
    // Add form validation to all forms
    const forms = document.querySelectorAll('form.needs-validation');
    forms.forEach(form => {
        FormValidator.addValidationToForm(form);
    });
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});

// Export for use in other scripts
window.Utils = Utils;
window.FormValidator = FormValidator;
window.LoadingManager = LoadingManager;
