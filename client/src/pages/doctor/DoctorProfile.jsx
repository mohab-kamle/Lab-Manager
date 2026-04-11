import React from "react";
import StaffProfile from "../../components/profile/StaffProfile";

/**
 * DoctorProfile - Profile page for users with the "doctor" role.
 *
 * Thin wrapper around the shared StaffProfile component.
 * All profile logic (data fetching, editing, validation) is handled by StaffProfile.
 */
const DoctorProfile = () => {
  return <StaffProfile />;
};

export default DoctorProfile;
