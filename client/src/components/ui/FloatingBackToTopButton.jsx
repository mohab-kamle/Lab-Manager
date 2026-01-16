import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';

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

    const renderTooltip = (props) => (
        <Tooltip id="back-to-top-tooltip" {...props}>
            Scroll to top
        </Tooltip>
    );

    return (
        <OverlayTrigger
            placement="left"
            overlay={renderTooltip}
            delay={{ show: 250, hide: 400 }}
        >
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
                style={{ pointerEvents: showScrollTop ? 'auto' : 'none' }}
                tabIndex={showScrollTop ? 0 : -1}
                aria-hidden={!showScrollTop}
                title="Scroll to top"
            >
                <ArrowUp size={24} />
            </motion.button>
        </OverlayTrigger>
    );
}

export default FloatingBackToTopButton;
