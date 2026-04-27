import React, { useEffect, useState } from "react";
import axios from "axios";
import { Pencil, Plus, Check, X } from "lucide-react";
import PropTypes from "prop-types";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

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
        return <LoadingSpinner message="Loading payment methods..." />;
    }

    if (error) {
        return <p className="text-danger text-center p-4">{error}</p>;
    }

    return (
        <div className="container p-4 bg-theme-surface rounded shadow-lg" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h1 className="fs-4 fw-bold mb-4 text-center text-theme">Payment Methods</h1>
            
            <div className="row g-3">
                {paymentMethods.length === 0 ? (
                    <div className="col-12 text-center">
                        <p className="text-muted">No payment methods available.</p>
                    </div>
                ) : (
                    paymentMethods.map((method) => {
                        const isGeneral = method.lab_id == null;
                        return (
                            <div key={method.id} className="col-12 col-sm-6 col-md-4">
                                <div className="d-flex flex-column align-items-center p-4 border rounded shadow-sm bg-theme-surface h-100">
                                    {editingMethod === method.id ? (
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="form-control text-center mb-2"
                                            disabled={isGeneral}
                                        />
                                    ) : (
                                        <p className="fs-5 fw-medium text-center text-theme mb-2">{method.name}</p>
                                    )}
                                    {editingMethod === method.id ? (
                                        <div className="d-flex gap-2 mt-auto">
                                            <button className="btn btn-success btn-sm d-flex align-items-center" onClick={() => handleSaveEdit(method.id)} disabled={saving || isGeneral}>
                                                {saving ? "Saving..." : <Check size={16} />}
                                            </button>
                                            <button className="btn btn-secondary btn-sm d-flex align-items-center" onClick={() => setEditingMethod(null)}>
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button className={`btn btn-sm d-flex align-items-center mt-auto ${isGeneral ? 'btn-secondary disabled' : 'btn-primary'}`}
                                                onClick={() => !isGeneral && handleEdit(method)}
                                                disabled={isGeneral}
                                        >
                                            <Pencil size={16} className="me-2" /> Edit
                                        </button>
                                    )}
                                    {isGeneral && <span className="mt-2 small text-muted">(Global method - uneditable)</span>}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Add New Payment Method Form */}
            {showForm ? (
                <div className="mt-4 p-4 border rounded shadow-sm">
                    <input
                        type="text"
                        placeholder="Enter payment method name"
                        value={newMethodName}
                        onChange={(e) => setNewMethodName(e.target.value)}
                        className="form-control mb-3"
                    />
                    <div className="d-flex gap-2">
                        <button 
                            className="btn btn-secondary"
                            onClick={() => setShowForm(false)}
                        >
                            Cancel
                        </button>
                        <button 
                            className="btn btn-primary"
                            onClick={handleAddPaymentMethod}
                            disabled={adding}
                        >
                            {adding ? "Adding..." : "Add"}
                        </button>
                    </div>
                </div>
            ) : (
                <button 
                    className="btn btn-primary w-100 d-flex justify-content-center align-items-center mt-4 shadow-sm"
                    onClick={() => setShowForm(true)}
                >
                    <Plus size={18} className="me-2" /> Add New Method
                </button>
            )}
        </div>
    );
};

export default PaymentMethods;
