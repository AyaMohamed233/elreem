// Authentication JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Password toggle functionality
    const togglePassword = document.getElementById('togglePassword');
    const passwordField = document.getElementById('password');
    
    if (togglePassword && passwordField) {
        togglePassword.addEventListener('click', function() {
            const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordField.setAttribute('type', type);
            
            const icon = this.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    }
    
    // Confirm password toggle functionality
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
    const confirmPasswordField = document.getElementById('confirmPassword');
    
    if (toggleConfirmPassword && confirmPasswordField) {
        toggleConfirmPassword.addEventListener('click', function() {
            const type = confirmPasswordField.getAttribute('type') === 'password' ? 'text' : 'password';
            confirmPasswordField.setAttribute('type', type);
            
            const icon = this.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    }
    
    // Password confirmation validation
    if (passwordField && confirmPasswordField) {
        function validatePasswordMatch() {
            if (confirmPasswordField.value !== passwordField.value) {
                confirmPasswordField.setCustomValidity('Passwords do not match');
            } else {
                confirmPasswordField.setCustomValidity('');
            }
        }
        
        passwordField.addEventListener('input', validatePasswordMatch);
        confirmPasswordField.addEventListener('input', validatePasswordMatch);
    }
    
    // Enhanced form validation for signup
    const signupForm = document.querySelector('form[action="/signup"]');
    if (signupForm) {
        signupForm.addEventListener('submit', function(e) {
            const firstName = document.getElementById('firstName').value.trim();
            const lastName = document.getElementById('lastName').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            let isValid = true;
            let errorMessage = '';
            
            // Validate required fields
            if (!firstName) {
                errorMessage = 'First name is required';
                isValid = false;
            } else if (!lastName) {
                errorMessage = 'Last name is required';
                isValid = false;
            } else if (!email) {
                errorMessage = 'Email is required';
                isValid = false;
            } else if (!FormValidator.validateEmail(email)) {
                errorMessage = 'Please enter a valid email address';
                isValid = false;
            } else if (!password) {
                errorMessage = 'Password is required';
                isValid = false;
            } else if (!FormValidator.validatePassword(password)) {
                errorMessage = 'Password must be at least 6 characters long';
                isValid = false;
            } else if (!FormValidator.validateEnglishOnly(password)) {
                errorMessage = 'Password must contain only English characters';
                isValid = false;
            } else if (password !== confirmPassword) {
                errorMessage = 'Passwords do not match';
                isValid = false;
            }
            
            if (!isValid) {
                e.preventDefault();
                Utils.showToast(errorMessage, 'danger');
                return false;
            }
            
            // Show loading state
            const submitBtn = signupForm.querySelector('button[type="submit"]');
            LoadingManager.showLoading(submitBtn, 'Creating Account...');
        });
    }
    
    // Enhanced form validation for login
    const loginForm = document.querySelector('form[action="/login"]');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            
            let isValid = true;
            let errorMessage = '';
            
            if (!email) {
                errorMessage = 'Email is required';
                isValid = false;
            } else if (!FormValidator.validateEmail(email)) {
                errorMessage = 'Please enter a valid email address';
                isValid = false;
            } else if (!password) {
                errorMessage = 'Password is required';
                isValid = false;
            }
            
            if (!isValid) {
                e.preventDefault();
                Utils.showToast(errorMessage, 'danger');
                return false;
            }
            
            // Show loading state
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            LoadingManager.showLoading(submitBtn, 'Signing In...');
        });
    }
    
    // Auto-focus first input field
    const firstInput = document.querySelector('input:not([type="hidden"])');
    if (firstInput) {
        firstInput.focus();
    }
    
    // Handle Google OAuth button
    const googleBtn = document.querySelector('a[href="/auth/google"]');
    if (googleBtn) {
        googleBtn.addEventListener('click', function() {
            LoadingManager.showLoading(this, 'Redirecting to Google...');
        });
    }
    
    // Real-time email validation
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('blur', function() {
            const email = this.value.trim();
            if (email && !FormValidator.validateEmail(email)) {
                this.classList.add('is-invalid');
                this.classList.remove('is-valid');
            } else if (email) {
                this.classList.add('is-valid');
                this.classList.remove('is-invalid');
            }
        });
    }
    
    // Password strength indicator removed as requested

    
    // Handle form submission errors
    window.addEventListener('load', function() {
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');
        
        if (error) {
            Utils.showToast(decodeURIComponent(error), 'danger');
        }
    });
});
