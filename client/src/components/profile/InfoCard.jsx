import React from "react";
import { Form } from "react-bootstrap";
import { motion } from "framer-motion";

/**
 * InfoCard - Reusable profile info display/edit field.
 *
 * Supports read-only display, inline text editing, and select dropdowns.
 * Used across all staff profile pages (admin, doctor, chemist, employee, receptionist).
 *
 * @param {Object} props
 * @param {React.ComponentType} props.icon - Lucide icon component to render
 * @param {string} props.label - Field label text
 * @param {string} props.value - Current field value
 * @param {string} [props.color="primary"] - Bootstrap color variant for icon background
 * @param {number} [props.delay=0] - Animation entrance delay in seconds
 * @param {boolean} [props.isEditing=false] - Whether the field is in edit mode
 * @param {string} [props.name] - Form field name for editing
 * @param {function} [props.onChange] - Change handler for edit mode
 * @param {string} [props.type="text"] - Input type ("text", "email", "date", "select")
 * @param {Array} [props.options=[]] - Options array for select type: [{value, label}]
 * @param {string} [props.error] - Validation error message
 */
const InfoCard = ({
  icon: Icon,
  label,
  value,
  color = "primary",
  delay = 0,
  isEditing = false,
  name,
  onChange,
  type = "text",
  options = [],
  error,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay }}
    className="d-flex align-items-center p-3 border rounded mb-3 shadow-sm h-100 info-card"
  >
    <div className={`bg-${color} bg-opacity-10 p-3 rounded-circle me-3`}>
      <Icon size={24} className={`text-${color}`} />
    </div>
    <div className="flex-grow-1">
      <small className="text-muted d-block text-uppercase fw-bold info-card-label">
        {label}
      </small>
      {isEditing ? (
        type === "select" ? (
          <>
            <Form.Select
              size="sm"
              name={name}
              value={value || ""}
              onChange={onChange}
              className="mt-1"
              isInvalid={!!error}
            >
              <option value="">Select {label}</option>
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Form.Select>
            <Form.Control.Feedback type="invalid">
              {error}
            </Form.Control.Feedback>
          </>
        ) : (
          <>
            <Form.Control
              type={type}
              size="sm"
              name={name}
              value={value || ""}
              onChange={onChange}
              className="mt-1"
              isInvalid={!!error}
            />
            <Form.Control.Feedback type="invalid">
              {error}
            </Form.Control.Feedback>
          </>
        )
      ) : (
        <span className="fw-medium fs-6">{value || "Not provided"}</span>
      )}
    </div>
  </motion.div>
);

export default InfoCard;
