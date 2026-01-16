import React from 'react';
import PropTypes from 'prop-types';
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
        />
    </div>
  );
};

LoadingSpinner.propTypes = {
  message: PropTypes.string,
  size: PropTypes.number,
  containerClassName: PropTypes.string,
};

export default LoadingSpinner;
