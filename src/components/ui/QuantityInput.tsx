import './QuantityInput.css';

type QuantityInputProps = {
  value: number;
  onChange: (value: number) => void;
  id?: string;
  className?: string;
};

const QuantityInput = ({ value, onChange, id, className = '' }: QuantityInputProps) => {
  const handleIncrement = () => {
    onChange(value + 1);
  };

  const handleDecrement = () => {
    if (value > 1) {
      onChange(value - 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow empty string for editing
    if (inputValue === '') {
      return;
    }
    
    // Only allow positive integers
    if (/^[1-9][0-9]*$/.test(inputValue)) {
      onChange(parseInt(inputValue));
    }
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // If empty or invalid, reset to 1
    if (inputValue === '' || parseInt(inputValue) < 1 || isNaN(parseInt(inputValue))) {
      onChange(1);
    }
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Auto-select all text when clicking on the input
    e.target.select();
  };

  return (
    <div className={`quantity-input ${className}`}>
      <button
        type="button"
        className="quantity-button quantity-button-plus"
        onClick={handleIncrement}
        aria-label="Increase quantity"
      >
        +
      </button>
      
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value.toString()}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onFocus={handleInputFocus}
        className="quantity-input-field"
        aria-label="Quantity"
      />
      <button
        type="button"
        className={`quantity-button quantity-button-minus ${value <= 1 ? 'disabled' : ''}`}
        onClick={handleDecrement}
        disabled={value <= 1}
        aria-label="Decrease quantity"
      >
        -
      </button>
      
    </div>
  );
};

export default QuantityInput;