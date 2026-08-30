import React, { useState } from 'react';

export interface RatingOverlayProps {
  initialRating?: number;
  onRate: (rating: number) => Promise<void>;
}

export const RatingOverlay: React.FC<RatingOverlayProps> = ({
  initialRating = 0,
  onRate
}) => {
  const [rating, setRating] = useState(initialRating);
  const [hovered, setHovered] = useState(0);

  const handleStarClick = async (star: number) => {
    setRating(star);
    await onRate(star);
  };

  return (
    <div className="rating-overlay">
      <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500 }}>Rate AI Quality:</span>
      <div className="rating-stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`rating-star ${(hovered || rating) >= star ? 'active' : ''}`}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => handleStarClick(star)}
            style={{ cursor: 'pointer', fontSize: '16px' }}
          >
            ★
          </span>
        ))}
      </div>
    </div>
  );
};
