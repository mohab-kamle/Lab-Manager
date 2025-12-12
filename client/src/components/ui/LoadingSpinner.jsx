import React from 'react';
import Lottie from 'lottie-react';
import loadingAnimation from '../../assets/LabLogoLoading.json';
import '../../styles/LoadingSpinner.css';

const LoadingSpinner = ({ message = "Loading..." , size = 250 , containerClassName = "loading-container"}) => {
  return (
    <div className={`${containerClassName}`}>
        <Lottie 
          animationData={loadingAnimation} 
          loop={true}
          style={{ width: size, height: size }}
        />
    </div>
  );
};

export default LoadingSpinner;
