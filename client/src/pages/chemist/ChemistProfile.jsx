import React from "react";
import StaffProfile from "../../components/profile/StaffProfile";

/**
 * ChemistProfile - Profile page for users with the "chemist" role.
 *
 * Thin wrapper around the shared StaffProfile component.
 * All profile logic (data fetching, editing, validation) is handled by StaffProfile.
 */
const ChemistProfile = () => {
  return <StaffProfile />;
};

export default ChemistProfile;
