import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

const ErrorPage = ({ message = "An unexpected error occurred." }) => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white p-10 rounded-lg shadow-sm max-w-md w-full mx-4"
            >
                <div className="flex flex-col items-center text-center">
                    <div className="mb-6">
                        <AlertCircle size={48} className="text-red-500" />
                    </div>
                    
                    <h1 className="text-2xl font-semibold text-gray-900 mb-3">
                        Oops! Something went wrong
                    </h1>
                    
                    <p className="text-gray-600 mb-8">
                        {message}
                    </p>
                    
                    <button 
                        onClick={() => navigate(-1)} 
                        className="px-6 py-2.5 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
                    >
                        Go Back
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default ErrorPage;
