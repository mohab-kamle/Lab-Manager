import React from 'react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import './PhoneInput.css';

const CustomPhoneInput = ({ value, onChange, label, error, ...props }) => {
  return (
    <div className="phone-input-container">
      {label && <label className="phone-input-label">{label}</label>}
      <PhoneInput
        international
        defaultCountry="EG"
        value={value}
        onChange={onChange}
        className={`custom-phone-input ${error ? 'has-error' : ''}`}
        {...props}
      />
      {error && <span className="phone-input-error">{error}</span>}
    </div>
  );
};

export default CustomPhoneInput;
