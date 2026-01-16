import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';


const FloatingBackToTopButton = () => {
    const [showScrollTop, setShowScrollTop] = useState(false);
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };
    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            setShowScrollTop(scrollTop > 300);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);
    return (
        <motion.button
                className="scroll-to-top-btn"
                onClick={scrollToTop}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ 
                    opacity: showScrollTop ? 1 : 0, 
                    scale: showScrollTop ? 1 : 0,
                    pointerEvents: showScrollTop ? 'auto' : 'none'
                }}
                transition={{ duration: 0.3 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Scroll to top"
                title="Scroll to top"
                tabIndex={showScrollTop ? 0 : -1}
            >
                <ArrowUp size={24} />
            </motion.button>
    );
}

export default FloatingBackToTopButton;
