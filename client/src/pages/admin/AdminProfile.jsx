import React from "react";
import StaffProfile from "../../components/profile/StaffProfile";

/**
 * AdminProfile - Profile page for users with the "admin" role.
 *
 * Thin wrapper around the shared StaffProfile component.
 * All profile logic (data fetching, editing, validation) is handled by StaffProfile.
 *
 * Note: The original AdminProfile logic has been extracted into StaffProfile
 * to be shared across all staff roles (admin, doctor, chemist, employee, receptionist).
 */
const AdminProfile = () => {
  return <StaffProfile />;
};

export default AdminProfile;
