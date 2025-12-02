import React from 'react';
import Lottie from 'lottie-react';
import loadingAnimation from '../../assets/LabLogoLoading.json';
import '../../styles/LoadingSpinner.css';

const LoadingSpinner = ({ message = "Loading..." }) => {
  return (
    <div className="loading-container">
        <Lottie 
          animationData={loadingAnimation} 
          loop={true}
          style={{ width: 250, height: 250 }}
        />
    </div>
  );
};

export default LoadingSpinner;
