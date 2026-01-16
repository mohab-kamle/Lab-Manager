import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 0 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -15 }
};

const PageTransition = ({ children }) => {
  return (
    <motion.div
      id="main-content"
      tabIndex="-1" // Allow programmatic focus for skip links
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{ width: '100%', outline: 'none' }} // Ensure it takes full width
    >
      {children}
    </motion.div>
  );
};

PageTransition.propTypes = {
  children: PropTypes.node
};

export default PageTransition;
