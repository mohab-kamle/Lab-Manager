import React from "react";
import StaffProfile from "../../components/profile/StaffProfile";

/**
 * EmployeeProfile - Profile page for users with the "employee" role.
 *
 * Thin wrapper around the shared StaffProfile component.
 * All profile logic (data fetching, editing, validation) is handled by StaffProfile.
 */
const EmployeeProfile = () => {
  return <StaffProfile />;
};

export default EmployeeProfile;
