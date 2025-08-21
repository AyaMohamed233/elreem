// Reviews JavaScript
class ReviewsManager {
    constructor() {
        this.currentRating = 0;
        this.init();
    }

    init() {
        this.bindEvents();
        this.initStarRating();
    }

    bindEvents() {
        // Review form submission
        const reviewForm = document.getElementById('reviewForm');
        if (reviewForm) {
            reviewForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitReview();
            });
        }

        // Admin delete review buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.delete-review-btn')) {
                e.preventDefault();
                const btn = e.target.closest('.delete-review-btn');
                const reviewId = btn.getAttribute('data-review-id');
                this.showDeleteConfirmation(reviewId);
            }
        });

        // Confirm delete review
        const confirmDeleteBtn = document.getElementById('confirmDeleteReview');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', () => {
                this.deleteReview();
            });
        }
    }

    initStarRating() {
        const starRating = document.getElementById('starRating');
        if (!starRating) return;

        const stars = starRating.querySelectorAll('.fa-star');
        
        stars.forEach((star, index) => {
            star.addEventListener('mouseenter', () => {
                this.highlightStars(index + 1);
            });

            star.addEventListener('mouseleave', () => {
                this.highlightStars(this.currentRating);
            });

            star.addEventListener('click', () => {
                this.setRating(index + 1);
            });
        });
    }

    highlightStars(rating) {
        const stars = document.querySelectorAll('#starRating .fa-star');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.remove('text-muted');
                star.classList.add('text-warning');
            } else {
                star.classList.remove('text-warning');
                star.classList.add('text-muted');
            }
        });
    }

    setRating(rating) {
        this.currentRating = rating;
        this.highlightStars(rating);
        
        const ratingInput = document.getElementById('ratingInput');
        if (ratingInput) {
            ratingInput.value = rating;
            ratingInput.classList.remove('is-invalid');
        }
    }

    async submitReview() {
        try {
            const form = document.getElementById('reviewForm');
            const formData = new FormData(form);
            
            const reviewData = {
                bagId: formData.get('bagId'),
                rating: this.currentRating,
                reviewText: formData.get('reviewText')
            };

            // Validate required fields
            if (!reviewData.bagId) {
                this.showValidationError('bagSelect', 'Please select a product');
                return;
            }

            if (!reviewData.rating || reviewData.rating < 1) {
                this.showValidationError('ratingInput', 'Please select a rating');
                return;
            }

            const submitBtn = form.querySelector('button[type="submit"]');
            LoadingManager.showLoading(submitBtn, 'Submitting...');

            const response = await Utils.makeRequest('/api/reviews', {
                method: 'POST',
                body: JSON.stringify(reviewData)
            });

            if (response.success) {
                Utils.showToast('Review submitted successfully!', 'success');
                
                // Reset form
                form.reset();
                this.setRating(0);
                
                // Reload page to show updated reviews
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            }

        } catch (error) {
            console.error('Error submitting review:', error);
            Utils.showToast(error.message || 'Failed to submit review', 'danger');
        } finally {
            const submitBtn = document.querySelector('#reviewForm button[type="submit"]');
            if (submitBtn) {
                LoadingManager.hideLoading(submitBtn, 'Submit Review');
            }
        }
    }

    showValidationError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.classList.add('is-invalid');
            const feedback = field.parentNode.querySelector('.invalid-feedback');
            if (feedback) {
                feedback.textContent = message;
            }
        }
    }

    showDeleteConfirmation(reviewId) {
        this.reviewToDelete = reviewId;
        const modal = new bootstrap.Modal(document.getElementById('deleteReviewModal'));
        modal.show();
    }

    async deleteReview() {
        if (!this.reviewToDelete) return;

        try {
            const confirmBtn = document.getElementById('confirmDeleteReview');
            LoadingManager.showLoading(confirmBtn, 'Deleting...');

            const response = await Utils.makeRequest(`/api/admin/reviews/${this.reviewToDelete}`, {
                method: 'DELETE'
            });

            if (response.success) {
                Utils.showToast('Review deleted successfully', 'success');
                
                // Remove the review row from table
                const reviewRow = document.querySelector(`tr[data-review-id="${this.reviewToDelete}"]`);
                if (reviewRow) {
                    reviewRow.remove();
                }

                // Hide modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('deleteReviewModal'));
                modal.hide();

                // Update statistics if no reviews left
                const remainingRows = document.querySelectorAll('tbody tr[data-review-id]');
                if (remainingRows.length === 0) {
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                }
            }

        } catch (error) {
            console.error('Error deleting review:', error);
            Utils.showToast(error.message || 'Failed to delete review', 'danger');
        } finally {
            const confirmBtn = document.getElementById('confirmDeleteReview');
            if (confirmBtn) {
                LoadingManager.hideLoading(confirmBtn, 'Delete Review');
            }
        }
    }
}

// Product Reviews Display (for product pages)
class ProductReviews {
    constructor(bagId) {
        this.bagId = bagId;
        this.init();
    }

    async init() {
        await this.loadReviews();
    }

    async loadReviews() {
        try {
            const response = await fetch(`/api/reviews/bag/${this.bagId}`);
            const data = await response.json();

            if (data.success) {
                this.displayReviews(data.data);
            }
        } catch (error) {
            console.error('Error loading reviews:', error);
        }
    }

    displayReviews(reviews) {
        const container = document.getElementById('productReviews');
        if (!container) return;

        if (reviews.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-star fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">No reviews yet</h5>
                    <p class="text-muted">Be the first to review this product!</p>
                </div>
            `;
            return;
        }

        const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

        let html = `
            <div class="reviews-summary mb-4">
                <div class="d-flex align-items-center">
                    <div class="average-rating me-3">
                        <h3 class="mb-0">${averageRating.toFixed(1)}</h3>
                        <div class="stars">
                            ${this.generateStars(averageRating)}
                        </div>
                        <small class="text-muted">${reviews.length} review${reviews.length !== 1 ? 's' : ''}</small>
                    </div>
                </div>
            </div>
            <div class="reviews-list">
        `;

        reviews.forEach(review => {
            html += `
                <div class="review-item mb-3 p-3 border rounded">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div>
                            <strong>${review.first_name} ${review.last_name}</strong>
                            <div class="stars">${this.generateStars(review.rating)}</div>
                        </div>
                        <small class="text-muted">${new Date(review.created_at).toLocaleDateString()}</small>
                    </div>
                    ${review.review_text ? `<p class="mb-0">${review.review_text}</p>` : ''}
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    generateStars(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            stars += `<i class="fas fa-star ${i <= rating ? 'text-warning' : 'text-muted'}"></i>`;
        }
        return stars;
    }
}

// Initialize based on current page
document.addEventListener('DOMContentLoaded', function() {
    const currentPath = window.location.pathname;
    
    if (currentPath === '/reviews') {
        window.reviewsManager = new ReviewsManager();
    } else if (currentPath === '/admin/reviews') {
        window.reviewsManager = new ReviewsManager();
    }
    
    // Initialize product reviews if on product page
    const productReviewsContainer = document.getElementById('productReviews');
    if (productReviewsContainer) {
        const bagId = productReviewsContainer.getAttribute('data-bag-id');
        if (bagId) {
            window.productReviews = new ProductReviews(bagId);
        }
    }
});
