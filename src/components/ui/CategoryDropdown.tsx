import { useState, useRef, useEffect } from 'react';
import { FiChevronDown } from 'react-icons/fi';
import { categories, getCategoryById } from '../../config/categories';
import './CategoryDropdown.css';

interface CategoryDropdownProps {
  value: string;
  onChange: (categoryId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const CategoryDropdown = ({ value, onChange, placeholder = 'Select category', disabled = false }: CategoryDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const selectedCategory = getCategoryById(value);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleSelect = (categoryId: string) => {
    onChange(categoryId);
    setIsOpen(false);
  };
  
  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };
  
  return (
    <div className={`category-dropdown ${disabled ? 'disabled' : ''}`} ref={dropdownRef}>
      <button
        type="button"
        className={`category-dropdown-trigger ${isOpen ? 'open' : ''}`}
        onClick={toggleDropdown}
        disabled={disabled}
      >
        <div className="category-dropdown-selected">
          {selectedCategory ? (
            <>
              <span className="category-icon">{selectedCategory.icon}</span>
              <span className="category-name">{selectedCategory.name}</span>
            </>
          ) : (
            <span className="category-placeholder">{placeholder}</span>
          )}
        </div>
        <FiChevronDown className={`dropdown-arrow ${isOpen ? 'rotated' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="category-dropdown-menu">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={`category-dropdown-option ${value === category.id ? 'selected' : ''}`}
              onClick={() => handleSelect(category.id)}
            >
              <span className="category-icon">{category.icon}</span>
              <span className="category-name">{category.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoryDropdown;