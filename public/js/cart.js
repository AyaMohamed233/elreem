// Shopping Cart JavaScript
class ShoppingCart {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateCartCount();
    }

    bindEvents() {
        // Add to cart buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.add-to-cart-btn')) {
                e.preventDefault();
                const btn = e.target.closest('.add-to-cart-btn');
                const bagId = btn.getAttribute('data-bag-id');
                this.showAddToCartModal(bagId);
            }
        });

        // Confirm add to cart
        const confirmBtn = document.getElementById('confirmAddToCart');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.addToCart();
            });
        }

        // Quantity controls in cart
        document.addEventListener('click', (e) => {
            if (e.target.closest('.quantity-increase')) {
                e.preventDefault();
                const input = e.target.closest('.quantity-controls').querySelector('.quantity-input');
                const newValue = parseInt(input.value) + 1;
                this.updateQuantity(input.getAttribute('data-item-id'), newValue);
            }

            if (e.target.closest('.quantity-decrease')) {
                e.preventDefault();
                const input = e.target.closest('.quantity-controls').querySelector('.quantity-input');
                const newValue = Math.max(1, parseInt(input.value) - 1);
                this.updateQuantity(input.getAttribute('data-item-id'), newValue);
            }
        });

        // Remove from cart
        document.addEventListener('click', (e) => {
            if (e.target.closest('.remove-item-btn')) {
                e.preventDefault();
                const btn = e.target.closest('.remove-item-btn');
                const itemId = btn.getAttribute('data-item-id');
                this.removeFromCart(itemId);
            }
        });

        // Checkout form
        const checkoutForm = document.getElementById('checkoutForm');
        if (checkoutForm) {
            checkoutForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.checkout();
            });
        }

        // Cancel order
        document.addEventListener('click', (e) => {
            if (e.target.closest('.cancel-order-btn')) {
                e.preventDefault();
                const btn = e.target.closest('.cancel-order-btn');
                const orderId = btn.getAttribute('data-order-id');
                this.cancelOrder(orderId);
            }
        });
    }

    async showAddToCartModal(bagId) {
        try {
            // Get bag details
            const response = await fetch(`/api/bags/${bagId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch bag details');
            }
            
            const bag = await response.json();
            
            // Set bag ID in modal
            document.getElementById('modalBagId').value = bagId;
            
            // Set max quantity
            const quantityInput = document.getElementById('modalQuantity');
            quantityInput.max = bag.quantity;
            quantityInput.value = 1;
            
            // Show color options if available
            const colorSelection = document.getElementById('colorSelection');
            const colorOptions = document.getElementById('colorOptions');
            
            if (bag.colors && bag.colors.length > 0) {
                colorSelection.style.display = 'block';
                colorOptions.innerHTML = '';
                
                bag.colors.forEach(color => {
                    const colorOption = document.createElement('div');
                    colorOption.className = 'form-check';
                    colorOption.innerHTML = `
                        <input class="form-check-input" type="radio" name="selectedColor" value="${color}" id="color_${color}" required>
                        <label class="form-check-label" for="color_${color}">
                            <span class="color-swatch me-2" style="background-color: ${color.toLowerCase()}; width: 16px; height: 16px; display: inline-block; border-radius: 50%; border: 1px solid #ddd;"></span>
                            ${color}
                        </label>
                    `;
                    colorOptions.appendChild(colorOption);
                });
                
                // Select first color by default
                colorOptions.querySelector('input[type="radio"]').checked = true;
            } else {
                colorSelection.style.display = 'none';
            }
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('addToCartModal'));
            modal.show();
            
        } catch (error) {
            console.error('Error showing add to cart modal:', error);
            Utils.showToast('Failed to load product details', 'danger');
        }
    }

    async addToCart() {
        try {
            const form = document.getElementById('addToCartForm');
            const formData = new FormData(form);

            const bagId = formData.get('bagId');
            const quantity = parseInt(formData.get('quantity'));
            const selectedColor = formData.get('selectedColor') || '';

            if (!bagId || !quantity || quantity < 1) {
                Utils.showToast('Please select a valid quantity', 'warning');
                return;
            }

            const confirmBtn = document.getElementById('confirmAddToCart');
            LoadingManager.showLoading(confirmBtn, 'Adding...');

            const response = await Utils.makeRequest('/api/cart/add', {
                method: 'POST',
                body: JSON.stringify({
                    bagId: bagId,
                    quantity: quantity,
                    selectedColor: selectedColor
                })
            });

            if (response.success) {
                Utils.showToast('Item added to cart successfully', 'success');
                this.updateCartCount();

                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('addToCartModal'));
                modal.hide();
            }

        } catch (error) {
            console.error('Error adding to cart:', error);
            Utils.showToast(error.message || 'Failed to add item to cart', 'danger');
        } finally {
            const confirmBtn = document.getElementById('confirmAddToCart');
            LoadingManager.hideLoading(confirmBtn);
        }
    }

    // Direct add to cart method for product pages
    async addToCartDirect(bagId, quantity, selectedColor) {
        try {
            if (!bagId || !quantity || quantity < 1) {
                Utils.showToast('Please select a valid quantity', 'warning');
                return;
            }

            const response = await Utils.makeRequest('/api/cart/add', {
                method: 'POST',
                body: JSON.stringify({
                    bagId: bagId,
                    quantity: quantity,
                    selectedColor: selectedColor || ''
                })
            });

            if (response.success) {
                Utils.showToast('Item added to cart successfully', 'success');
                this.updateCartCount();

                // Optional: redirect to cart page after a delay
                setTimeout(() => {
                    if (confirm('Item added to cart! Would you like to view your cart?')) {
                        window.location.href = '/cart';
                    }
                }, 1000);
            } else {
                Utils.showToast(response.error || 'Failed to add item to cart', 'danger');
            }

        } catch (error) {
            console.error('Error adding to cart:', error);
            Utils.showToast(error.message || 'Failed to add item to cart', 'danger');
        }
    }

    async updateQuantity(itemId, quantity) {
        try {
            const response = await Utils.makeRequest(`/api/cart/update/${itemId}`, {
                method: 'PUT',
                body: JSON.stringify({ quantity: quantity })
            });
            
            if (response.success) {
                // Update the input value
                const input = document.querySelector(`[data-item-id="${itemId}"]`);
                if (input) {
                    input.value = quantity;
                }
                
                // Refresh the page to update totals
                window.location.reload();
            }
            
        } catch (error) {
            console.error('Error updating quantity:', error);
            Utils.showToast(error.message || 'Failed to update quantity', 'danger');
        }
    }

    async removeFromCart(itemId) {
        if (!confirm('Are you sure you want to remove this item from your cart?')) {
            return;
        }
        
        try {
            const response = await Utils.makeRequest(`/api/cart/remove/${itemId}`, {
                method: 'DELETE'
            });
            
            if (response.success) {
                Utils.showToast('Item removed from cart', 'success');
                
                // Remove the item from DOM
                const itemElement = document.querySelector(`[data-item-id="${itemId}"]`).closest('.cart-item');
                if (itemElement) {
                    itemElement.remove();
                }
                
                this.updateCartCount();
                
                // Refresh the page to update totals
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            }
            
        } catch (error) {
            console.error('Error removing from cart:', error);
            Utils.showToast(error.message || 'Failed to remove item', 'danger');
        }
    }

    async checkout() {
        try {
            const form = document.getElementById('checkoutForm');
            const formData = new FormData(form);
            
            const customerData = {
                customerName: formData.get('customerName'),
                customerPhone: formData.get('customerPhone'),
                customerAddress: formData.get('customerAddress'),
                customerEmail: formData.get('customerEmail')
            };
            
            // Validate required fields
            for (const [key, value] of Object.entries(customerData)) {
                if (!value || value.trim() === '') {
                    Utils.showToast('Please fill in all required fields', 'warning');
                    return;
                }
            }
            
            const submitBtn = form.querySelector('button[type="submit"]');
            LoadingManager.showLoading(submitBtn, 'Processing...');
            
            const response = await Utils.makeRequest('/api/checkout', {
                method: 'POST',
                body: JSON.stringify(customerData)
            });
            
            if (response.success) {
                Utils.showToast('Order placed successfully!', 'success');
                
                // Redirect to order confirmation or orders page
                setTimeout(() => {
                    window.location.href = '/orders';
                }, 2000);
            }
            
        } catch (error) {
            console.error('Error during checkout:', error);
            Utils.showToast(error.message || 'Failed to process checkout', 'danger');
        } finally {
            const submitBtn = document.getElementById('checkoutForm').querySelector('button[type="submit"]');
            LoadingManager.hideLoading(submitBtn);
        }
    }

    async cancelOrder(orderId) {
        if (!confirm('Are you sure you want to cancel this order?')) {
            return;
        }
        
        try {
            const response = await Utils.makeRequest(`/api/order/cancel/${orderId}`, {
                method: 'POST'
            });
            
            if (response.success) {
                Utils.showToast('Order cancelled successfully', 'success');
                
                // Update order status in DOM
                const orderElement = document.querySelector(`[data-order-id="${orderId}"]`);
                if (orderElement) {
                    const statusBadge = orderElement.querySelector('.status-badge');
                    if (statusBadge) {
                        statusBadge.className = 'status-badge status-canceled';
                        statusBadge.textContent = 'Canceled';
                    }
                    
                    // Hide cancel button
                    const cancelBtn = orderElement.querySelector('.cancel-order-btn');
                    if (cancelBtn) {
                        cancelBtn.style.display = 'none';
                    }
                }
            }
            
        } catch (error) {
            console.error('Error cancelling order:', error);
            Utils.showToast(error.message || 'Failed to cancel order', 'danger');
        }
    }

    async updateCartCount() {
        try {
            const response = await fetch('/api/cart/count');
            if (response.ok) {
                const data = await response.json();
                const cartCountElement = document.getElementById('cartCount');
                if (cartCountElement) {
                    cartCountElement.textContent = data.count || 0;
                    cartCountElement.style.display = data.count > 0 ? 'inline' : 'none';
                }
            }
        } catch (error) {
            console.error('Error updating cart count:', error);
        }
    }
}

// Initialize shopping cart when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.shoppingCart = new ShoppingCart();
});
