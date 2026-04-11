import React from "react";
import StaffProfile from "../../components/profile/StaffProfile";

/**
 * ReceptionistProfile - Profile page for users with the "receptionist" role.
 *
 * Thin wrapper around the shared StaffProfile component.
 * All profile logic (data fetching, editing, validation) is handled by StaffProfile.
 */
const ReceptionistProfile = () => {
  return <StaffProfile />;
};

export default ReceptionistProfile;
