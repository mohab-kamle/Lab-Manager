import React, { useEffect, useState } from "react";
import axios from "axios";
import { Pencil, Plus, Check, X } from "lucide-react";
import PropTypes from "prop-types";

const PaymentMethods = () => {
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [newMethodName, setNewMethodName] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [adding, setAdding] = useState(false);
    const [editingMethod, setEditingMethod] = useState(null);
    const [editName, setEditName] = useState("");
    const [saving, setSaving] = useState(false);

    const apiUrl = import.meta.env.VITE_API_URL;

    useEffect(() => {
        fetchPaymentMethods();
    }, []);

    const fetchPaymentMethods = () => {
        const token = localStorage.getItem("token");
        setLoading(true);

        axios.get(`${apiUrl}/payment-methods`, {
            headers: { Authorization: `Bearer ${token}` },
        })
        .then((response) => {
            if (Array.isArray(response.data)) {
                setPaymentMethods(response.data);
            } else {
                console.error("Unexpected response format:", response.data);
                setError("Unexpected data format received from the server.");
            }
            setLoading(false);
        })
        .catch((error) => {
            console.error("Error fetching payment methods:", error);
            setError("Failed to fetch payment methods. Please try again later.");
            setLoading(false);
        });
    };

    const handleAddPaymentMethod = () => {
        if (!newMethodName.trim()) return;
        
        const token = localStorage.getItem("token");
        setAdding(true);

        axios.post(
            `${apiUrl}/payment-methods`,
            { name: newMethodName },
            { headers: { Authorization: `Bearer ${token}` } }
        )
        .then((response) => {
            setPaymentMethods([...paymentMethods, response.data]); // Update UI
            setNewMethodName("");
            setShowForm(false);
        })
        .catch((error) => {
            console.error("Error adding payment method:", error);
            setError("Failed to add payment method. Please try again.");
        })
        .finally(() => {
            setAdding(false);
        });
    };

    const handleEdit = (method) => {
        setEditingMethod(method.id);
        setEditName(method.name);
    };

    const handleSaveEdit = (id) => {
        if (!editName.trim()) return;
        
        const token = localStorage.getItem("token");
        setSaving(true);
        
        axios.put(
            `${apiUrl}/payment-methods/${id}`,
            { name: editName },
            { headers: { Authorization: `Bearer ${token}` } }
        )
        .then(() => {
            setPaymentMethods(
                paymentMethods.map((method) =>
                    method.id === id ? { ...method, name: editName } : method
                )
            );
            setEditingMethod(null);
        })
        .catch((error) => {
            console.error("Error updating payment method:", error);
            setError("Failed to update payment method. Please try again.");
        })
        .finally(() => {
            setSaving(false);
        });
    };

    if (loading) {
        return <div className="text-center p-6 text-lg font-medium">Loading...</div>;
    }

    if (error) {
        return <p className="text-red-500 text-center p-6">{error}</p>;
    }

    return (
        <div className="max-w-3xl mx-auto p-4 bg-white rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold mb-4 text-center">Payment Methods</h1>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {paymentMethods.length === 0 ? (
                    <p className="text-gray-600 col-span-full text-center">No payment methods available.</p>
                ) : (
                    paymentMethods.map((method) => (
                        <div key={method.id} className="flex flex-col items-center p-4 border rounded-lg shadow-lg bg-gray-50">
                            {editingMethod === method.id ? (
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full p-2 border rounded text-center"
                                />
                            ) : (
                                <p className="text-lg font-medium text-center">{method.name}</p>
                            )}
                            {editingMethod === method.id ? (
                                <div className="flex mt-2 space-x-2">
                                    <button className="px-3 py-1 bg-green-500   rounded flex items-center" onClick={() => handleSaveEdit(method.id)} disabled={saving}>
                                        {saving ? "Saving..." : <Check size={16} />}
                                    </button>
                                    <button className="px-3 py-1 bg-gray-300 rounded flex items-center" onClick={() => setEditingMethod(null)}>
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <button className="mt-2 px-3 py-1 border rounded flex items-center bg-blue-500  " onClick={() => handleEdit(method)}>
                                    <Pencil size={16} className="mr-2" /> Edit
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Add New Payment Method Form */}
            {showForm ? (
                <div className="mt-5 p-4 border rounded-lg shadow">
                    <input
                        type="text"
                        placeholder="Enter payment method name"
                        value={newMethodName}
                        onChange={(e) => setNewMethodName(e.target.value)}
                        className="w-full p-2 border rounded"
                    />
                    <div className="flex mt-2 space-x-2">
                        <button 
                            className="px-4 py-2 bg-gray-300 rounded"
                            onClick={() => setShowForm(false)}
                        >
                            Cancel
                        </button>
                        <button 
                            className="bg-blue-500 px-4 py-2   rounded"
                            onClick={handleAddPaymentMethod}
                            disabled={adding}
                        >
                            {adding ? "Adding..." : "Add"}
                        </button>
                    </div>
                </div>
            ) : (
                <button 
                    className="mt-6 w-full flex items-center justify-center px-4 py-2 bg-blue-500   rounded shadow-lg"
                    onClick={() => setShowForm(true)}
                >
                    <Plus size={18} className="mr-2" /> Add New Method
                </button>
            )}
        </div>
    );
};

export default PaymentMethods;
