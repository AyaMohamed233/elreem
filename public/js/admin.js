// Admin Dashboard JavaScript
class AdminDashboard {
    constructor() {
        this.init();
    }

    init() {
        this.loadStats();
        this.loadRecentActivity();
        this.bindEvents();
    }

    bindEvents() {
        // Backup button
        const backupBtn = document.getElementById('backupBtn');
        if (backupBtn) {
            backupBtn.addEventListener('click', () => {
                this.backupDatabase();
            });
        }
    }

    async loadStats() {
        try {
            const response = await Utils.makeRequest('/api/admin/stats');
            
            if (response.success) {
                const stats = response.data;
                
                document.getElementById('totalProducts').textContent = stats.totalProducts || 0;
                document.getElementById('totalOrders').textContent = stats.totalOrders || 0;
                document.getElementById('totalRevenue').textContent = (stats.totalRevenue || 0).toFixed(2) + ' LE';
                document.getElementById('pendingOrders').textContent = stats.pendingOrders || 0;
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async loadRecentActivity() {
        try {
            const response = await Utils.makeRequest('/api/admin/recent-activity');
            
            const activityContainer = document.getElementById('recentActivity');
            
            if (response.success && response.data.length > 0) {
                activityContainer.innerHTML = '';
                
                response.data.forEach(activity => {
                    const activityItem = document.createElement('div');
                    activityItem.className = 'border-bottom pb-2 mb-2';
                    activityItem.innerHTML = `
                        <div class="d-flex justify-content-between">
                            <div>
                                <strong>${activity.type}</strong>
                                <p class="mb-0 text-muted">${activity.description}</p>
                            </div>
                            <small class="text-muted">${Utils.formatDate(activity.created_at)}</small>
                        </div>
                    `;
                    activityContainer.appendChild(activityItem);
                });
            } else {
                activityContainer.innerHTML = `
                    <div class="text-center py-3 text-muted">
                        <i class="fas fa-info-circle me-2"></i>
                        <span data-en="No recent activity" data-ar="لا يوجد نشاط حديث">No recent activity</span>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading recent activity:', error);
            const activityContainer = document.getElementById('recentActivity');
            activityContainer.innerHTML = `
                <div class="text-center py-3 text-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <span data-en="Failed to load activity" data-ar="فشل في تحميل النشاط">Failed to load activity</span>
                </div>
            `;
        }
    }

    async backupDatabase() {
        try {
            const backupBtn = document.getElementById('backupBtn');
            LoadingManager.showLoading(backupBtn, 'Creating backup...');
            
            const response = await Utils.makeRequest('/api/admin/backup', {
                method: 'POST'
            });
            
            if (response.success) {
                Utils.showToast('Database backup created successfully', 'success');
                
                // Download the backup file
                if (response.downloadUrl) {
                    const link = document.createElement('a');
                    link.href = response.downloadUrl;
                    link.download = response.filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            }
        } catch (error) {
            console.error('Error creating backup:', error);
            Utils.showToast(error.message || 'Failed to create backup', 'danger');
        } finally {
            const backupBtn = document.getElementById('backupBtn');
            LoadingManager.hideLoading(backupBtn);
        }
    }
}

// Inventory Management
class InventoryManager {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        // Add product form
        const addProductForm = document.getElementById('addProductForm');
        if (addProductForm) {
            addProductForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addProduct();
            });
        }

        // Edit product buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.edit-product-btn')) {
                e.preventDefault();
                const btn = e.target.closest('.edit-product-btn');
                const productId = btn.getAttribute('data-product-id');
                this.editProduct(productId);
            }
        });

        // Delete product buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.delete-product-btn')) {
                e.preventDefault();
                const btn = e.target.closest('.delete-product-btn');
                const productId = btn.getAttribute('data-product-id');
                this.deleteProduct(productId);
            }
        });

        // Color management
        const addColorBtn = document.getElementById('addColorBtn');
        if (addColorBtn) {
            addColorBtn.addEventListener('click', () => {
                this.addColorField();
            });
        }

        // Remove color buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.remove-color-btn')) {
                e.preventDefault();
                e.target.closest('.color-input-group').remove();
            }
        });
    }

    async addProduct() {
        try {
            const form = document.getElementById('addProductForm');
            const formData = new FormData(form);
            
            // Collect colors
            const colorInputs = form.querySelectorAll('input[name="colors[]"]');
            const colors = Array.from(colorInputs).map(input => input.value).filter(color => color.trim() !== '');
            formData.delete('colors[]');
            formData.append('colors', JSON.stringify(colors));
            
            const submitBtn = form.querySelector('button[type="submit"]');
            LoadingManager.showLoading(submitBtn, 'Adding product...');
            
            const response = await fetch('/api/admin/bags', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                Utils.showToast('Product added successfully', 'success');
                form.reset();
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error adding product:', error);
            Utils.showToast(error.message || 'Failed to add product', 'danger');
        } finally {
            const submitBtn = document.getElementById('addProductForm').querySelector('button[type="submit"]');
            LoadingManager.hideLoading(submitBtn);
        }
    }

    async deleteProduct(productId) {
        if (!confirm('Are you sure you want to delete this product?')) {
            return;
        }
        
        try {
            const response = await Utils.makeRequest(`/api/admin/bags/${productId}`, {
                method: 'DELETE'
            });
            
            if (response.success) {
                Utils.showToast('Product deleted successfully', 'success');
                
                // Remove product row from table
                const productRow = document.querySelector(`[data-product-id="${productId}"]`).closest('tr');
                if (productRow) {
                    productRow.remove();
                }
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            Utils.showToast(error.message || 'Failed to delete product', 'danger');
        }
    }

    addColorField() {
        const colorContainer = document.getElementById('colorContainer');
        const colorGroup = document.createElement('div');
        colorGroup.className = 'color-input-group mb-2';
        colorGroup.innerHTML = `
            <div class="input-group">
                <input type="text" class="form-control" name="colors[]" placeholder="Color name">
                <button type="button" class="btn btn-outline-danger remove-color-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        colorContainer.appendChild(colorGroup);
    }
}

// Order Management
class OrderManager {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        // Update order status
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('order-status-select')) {
                const orderId = e.target.getAttribute('data-order-id');
                const newStatus = e.target.value;
                this.updateOrderStatus(orderId, newStatus);
            }
        });
    }

    async updateOrderStatus(orderId, status) {
        try {
            const response = await Utils.makeRequest(`/api/admin/orders/${orderId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: status })
            });
            
            if (response.success) {
                Utils.showToast('Order status updated successfully', 'success');
                
                // Update status badge
                const statusBadge = document.querySelector(`[data-order-id="${orderId}"]`).closest('tr').querySelector('.status-badge');
                if (statusBadge) {
                    statusBadge.className = `status-badge status-${status.toLowerCase().replace(' ', '-')}`;
                    statusBadge.textContent = status;
                }
            }
        } catch (error) {
            console.error('Error updating order status:', error);
            Utils.showToast(error.message || 'Failed to update order status', 'danger');
        }
    }
}

// Initialize based on current page
document.addEventListener('DOMContentLoaded', function() {
    const currentPath = window.location.pathname;
    
    if (currentPath === '/admin') {
        window.adminDashboard = new AdminDashboard();
    } else if (currentPath === '/admin/repository') {
        window.inventoryManager = new InventoryManager();
    } else if (currentPath === '/admin/reports') {
        window.orderManager = new OrderManager();
    }
});
