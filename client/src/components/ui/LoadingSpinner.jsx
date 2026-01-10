import React from 'react';
import Lottie from 'lottie-react';
import loadingAnimation from '../../assets/LabLogoLoading.json';
import '../../styles/LoadingSpinner.css';

const LoadingSpinner = ({ message = "Loading..." , size = 250 , containerClassName = "loading-container"}) => {
  return (
    <div className={`${containerClassName}`} role="status" aria-label={message}>
        <Lottie 
          animationData={loadingAnimation} 
          loop={true}
          style={{ width: size, height: size }}
          aria-hidden="true"
        />
        <span className="visually-hidden">{message}</span>
    </div>
  );
};

export default LoadingSpinner;
