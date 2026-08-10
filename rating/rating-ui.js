/**
 * @fileoverview Rating UI - 5-Star Rating Component for Response Feedback
 * 
 * Creates and manages the visual 5-star rating UI component that gets injected
 * into Gemini's AI response containers. Allows users to provide feedback on
 * the quality of AI responses.
 * 
 * @description
 * This module provides:
 * - Star rating button creation with accessibility support
 * - Hover highlight effects for star selection preview
 * - Click handling for rating submission
 * - Visual state updates (filled/empty stars)
 * - Integration with RatingManager for persistence
 * 
 * Visual States:
 * - Empty star (☆): Not selected
 * - Filled star (★): Selected/rated
 * - Hover state: Preview of potential rating
 * 
 * CSS Classes Used:
 * - .pa-rating-container: Main container
 * - .pa-rating-label: "Rate this response:" label
 * - .pa-stars-container: Stars wrapper
 * - .pa-star: Individual star button
 * - .pa-star-filled: Star is part of current rating
 * - .pa-star-hover: Star is highlighted on hover
 * 
 * @module rating/rating-ui
 * 
 * @example
 * // Create a rating UI for turn 0 with no current rating
 * const ratingElement = createRatingUI(0, null, (turnIndex, rating) => {
 *     console.log(`Turn ${turnIndex} rated ${rating} stars`);
 *     ratingManager.setRating(turnIndex, rating);
 * });
 * document.body.appendChild(ratingElement);
 */

// ============================================================================
// SECTION 1: Main Rating Component Factory
// ============================================================================

/**
 * Create a 5-star rating UI component
 * 
 * @param {number} turnIndex - Zero-based conversation turn index
 * @param {number|null} currentRating - Existing rating value (1-5) or null if unrated
 * @param {Function} onRate - Callback invoked when user clicks a star
 * @param {number} onRate.turnIndex - The turn that was rated
 * @param {number} onRate.rating - The star value selected (1-5)
 * @returns {HTMLElement} The complete rating container element
 * 
 * @description
 * Creates a rating component with:
 * - A text label ("Rate this response:" or "Your rating:")
 * - Five clickable star buttons with hover effects
 * - Accessibility attributes (aria-label on each star)
 * - Data attributes for state tracking
 * 
 * Data Attributes on Container:
 * - data-turn-index: The turn this rating is for
 * - data-rated: "true" if rated, "false" if not
 * - data-current-rating: Current numeric rating (0 if unrated)
 * 
 * @example
 * const ratingUI = createRatingUI(2, 4, async (idx, rating) => {
 *     await manager.setRating(idx, rating);
 *     console.log(`Saved rating ${rating} for turn ${idx}`);
 * });
 */
function createRatingUI(turnIndex, currentRating, onRate) {
    // === CREATE CONTAINER ===
    const container = document.createElement('div');
    container.className = 'pa-rating-container';
    container.dataset.turnIndex = turnIndex;
    container.dataset.rated = currentRating ? 'true' : 'false';

    // === CREATE LABEL ===
    // Changes from "Rate this response:" to "Your rating:" after rating
    const label = document.createElement('span');
    label.className = 'pa-rating-label';
    label.textContent = currentRating ? 'Your rating:' : 'Rate this response:';
    container.appendChild(label);

    // === CREATE STARS CONTAINER ===
    const starsContainer = document.createElement('div');
    starsContainer.className = 'pa-stars-container';

    // === CREATE 5 STAR BUTTONS ===
    for (let i = 1; i <= 5; i++) {
        const star = document.createElement('button');
        star.className = 'pa-star';
        star.dataset.value = i;
        star.type = 'button'; // Prevent form submission if in a form context
        star.setAttribute('aria-label', `Rate ${i} out of 5 stars`);

        // Set initial visual state based on current rating
        if (currentRating && i <= currentRating) {
            star.classList.add('pa-star-filled');
            star.textContent = '★'; // Filled star
        } else {
            star.textContent = '☆'; // Empty star
        }

        // === HOVER HANDLER ===
        // Preview rating by highlighting stars up to hovered position
        star.addEventListener('mouseenter', () => {
            highlightStars(starsContainer, i);
        });

        // === CLICK HANDLER ===
        // Submit rating and update visual state
        star.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            const rating = parseInt(star.dataset.value);

            // Update visual state immediately for responsiveness
            setStarsRating(starsContainer, rating);
            container.dataset.rated = 'true';
            label.textContent = 'Your rating:';

            // Invoke callback to persist rating
            if (onRate) {
                try {
                    await onRate(turnIndex, rating);
                    console.log(`[RatingUI] Rating ${rating} saved for turn ${turnIndex}`);
                } catch (error) {
                    console.error('[RatingUI] Failed to save rating:', error);
                }
            }
        });

        starsContainer.appendChild(star);
    }

    // === MOUSE LEAVE HANDLER ===
    // Reset to actual rating when mouse leaves the stars area
    starsContainer.addEventListener('mouseleave', () => {
        const currentVal = parseInt(container.dataset.currentRating) || 0;
        setStarsRating(starsContainer, currentVal);
    });

    container.appendChild(starsContainer);

    // Store current rating for reference
    container.dataset.currentRating = currentRating || 0;

    return container;
}

// ============================================================================
// SECTION 2: Star Visual State Functions
// ============================================================================

/**
 * Highlight stars up to a specified value (hover preview effect)
 * 
 * @param {HTMLElement} container - The stars container element
 * @param {number} upTo - Highlight stars 1 through upTo (inclusive)
 * 
 * @description
 * Called on mouseenter to show preview of what the rating would look like.
 * Adds .pa-star-hover class and changes to filled star character.
 */
function highlightStars(container, upTo) {
    const stars = container.querySelectorAll('.pa-star');

    stars.forEach((star, index) => {
        // index is 0-based, upTo is 1-based
        if (index < upTo) {
            // Highlight this star
            star.classList.add('pa-star-hover');
            star.textContent = '★';
        } else {
            // Remove highlight
            star.classList.remove('pa-star-hover');
            // Only show empty if not already filled by actual rating
            if (!star.classList.contains('pa-star-filled')) {
                star.textContent = '☆';
            }
        }
    });
}

/**
 * Set stars to display a specific rating value
 * 
 * @param {HTMLElement} container - The stars container element
 * @param {number} rating - Rating value (0-5), 0 clears all stars
 * 
 * @description
 * Updates the visual state of all stars to reflect the given rating.
 * Stars at or below the rating value are filled, others are empty.
 * Also updates the parent container's data-current-rating attribute.
 */
function setStarsRating(container, rating) {
    const stars = container.querySelectorAll('.pa-star');

    stars.forEach((star, index) => {
        // Remove any hover state
        star.classList.remove('pa-star-hover');

        // index is 0-based, rating is 1-based
        if (index < rating) {
            // Fill this star
            star.classList.add('pa-star-filled');
            star.textContent = '★';
        } else {
            // Empty this star
            star.classList.remove('pa-star-filled');
            star.textContent = '☆';
        }
    });

    // Update parent container's data attribute
    const parent = container.closest('.pa-rating-container');
    if (parent) {
        parent.dataset.currentRating = rating;
    }
}

// ============================================================================
// SECTION 3: Rating Update Function
// ============================================================================

/**
 * Update an existing rating UI component with a new rating value
 * 
 * @param {HTMLElement} ratingContainer - The .pa-rating-container element
 * @param {number} rating - New rating value (1-5) or 0 to clear
 * 
 * @description
 * Used to programmatically update a rating UI that's already in the DOM.
 * Updates the stars, label text, and data attributes.
 * 
 * @example
 * const existingUI = document.querySelector('.pa-rating-container[data-turn-index="2"]');
 * updateRatingUI(existingUI, 5); // Set to 5 stars
 */
function updateRatingUI(ratingContainer, rating) {
    const starsContainer = ratingContainer.querySelector('.pa-stars-container');
    const label = ratingContainer.querySelector('.pa-rating-label');

    // Update stars visual
    if (starsContainer) {
        setStarsRating(starsContainer, rating);
    }

    // Update label text
    if (label) {
        label.textContent = rating ? 'Your rating:' : 'Rate this response:';
    }

    // Update data attributes
    ratingContainer.dataset.rated = rating ? 'true' : 'false';
    ratingContainer.dataset.currentRating = rating || 0;
}

// ============================================================================
// SECTION 4: Module Exports
// ============================================================================
// Export functions for both browser (window) and Node.js (module.exports)
// ============================================================================

// Browser environment - attach to window for global access
if (typeof window !== 'undefined') {
    window.createRatingUI = createRatingUI;
    window.updateRatingUI = updateRatingUI;
}

// Node.js environment (for testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createRatingUI, updateRatingUI };
}

// Log ready state
console.log('[RatingUI] Rating UI component ready');
