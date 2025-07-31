import React from 'react';
import { categories } from '../../config/categories';
import './CategoryTags.css';

interface CategoryTagsProps {
  value: string;
  onChange: (categoryId: string) => void;
}

const CategoryTags: React.FC<CategoryTagsProps> = ({ value, onChange }) => {
  return (
    <div className="category-tags">
      {categories.map((category) => {
        const isSelected = value === category.id;
        return (
          <button
            key={category.id}
            type="button"
            className={`category-tag ${
              isSelected ? 'category-tag-selected' : 'category-tag-icon-only'
            }`}
            onClick={() => onChange(category.id)}
            title={category.name}
          >
            <span className="category-tag-icon">{category.icon}</span>
            {isSelected && (
              <span className="category-tag-name">{category.name}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default CategoryTags;