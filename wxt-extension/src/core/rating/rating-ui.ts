/**
 * @fileoverview 5-Star Rating Visual Component Factory
 * Ported from rating/rating-ui.js (281 lines)
 * @module rating/rating-ui
 */

export function highlightStars(starsContainer: HTMLElement, highlightCount: number): void {
  const stars = starsContainer.querySelectorAll<HTMLButtonElement>('.pa-star');
  stars.forEach((star, idx) => {
    if (idx < highlightCount) {
      star.classList.add('pa-star-hover');
      star.textContent = '★';
    } else {
      star.classList.remove('pa-star-hover');
      if (!star.classList.contains('pa-star-filled')) {
        star.textContent = '☆';
      }
    }
  });
}

export function setStarsRating(starsContainer: HTMLElement, rating: number): void {
  const stars = starsContainer.querySelectorAll<HTMLButtonElement>('.pa-star');
  stars.forEach((star, idx) => {
    star.classList.remove('pa-star-hover');
    if (idx < rating) {
      star.classList.add('pa-star-filled');
      star.textContent = '★';
    } else {
      star.classList.remove('pa-star-filled');
      star.textContent = '☆';
    }
  });
}

export function createRatingUI(
  turnIndex: number,
  currentRating: number | null,
  onRate?: (turnIndex: number, rating: number) => Promise<void> | void
): HTMLElement {
  const container = document.createElement('div');
  container.className = 'pa-rating-container';
  container.dataset.turnIndex = String(turnIndex);
  container.dataset.rated = currentRating ? 'true' : 'false';
  container.dataset.currentRating = String(currentRating || 0);

  const label = document.createElement('span');
  label.className = 'pa-rating-label';
  label.textContent = currentRating ? 'Your rating:' : 'Rate this response:';
  container.appendChild(label);

  const starsContainer = document.createElement('div');
  starsContainer.className = 'pa-stars-container';

  for (let i = 1; i <= 5; i++) {
    const star = document.createElement('button');
    star.className = 'pa-star';
    star.dataset.value = String(i);
    star.type = 'button';
    star.setAttribute('aria-label', 'Rate ' + i + ' out of 5 stars');

    if (currentRating && i <= currentRating) {
      star.classList.add('pa-star-filled');
      star.textContent = '★';
    } else {
      star.textContent = '☆';
    }

    star.addEventListener('mouseenter', () => {
      highlightStars(starsContainer, i);
    });

    star.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const rating = parseInt(star.dataset.value || '0', 10);
      setStarsRating(starsContainer, rating);
      container.dataset.rated = 'true';
      container.dataset.currentRating = String(rating);
      label.textContent = 'Your rating:';

      if (onRate) {
        await onRate(turnIndex, rating);
      }
    });

    starsContainer.appendChild(star);
  }

  starsContainer.addEventListener('mouseleave', () => {
    const currentVal = parseInt(container.dataset.currentRating || '0', 10);
    setStarsRating(starsContainer, currentVal);
  });

  container.appendChild(starsContainer);
  return container;
}

export function updateRatingUI(container: HTMLElement, rating: number): void {
  const stars = container.querySelectorAll<HTMLElement>('.pa-rating-star');
  stars.forEach((s, idx) => {
    if (idx < rating) {
      s.classList.add('active');
    } else {
      s.classList.remove('active');
    }
  });
}
