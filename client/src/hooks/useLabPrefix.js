import { useEffect, useState } from 'react';
import { useLab } from '../context/LabContext';
import { useAuth } from '../context/AuthContext';
/**
 * Returns current lab name from the LabContext.
 * If no lab name exists, returns an empty string.
 * Also provides a refresh function to manually refresh the lab data.
 */
export default function useLabPrefix() {

  const { labInfo, refreshLabData, loading, error } = useLab();
  const [prefix, setPrefix] = useState('');
  // check if the user is not logged in
  const { user } = useAuth();
  useEffect(() => {
    console.log('LabInfo in useLabPrefix:', labInfo); // Debug log
    if (!user) {
      console.log('User is not logged in');
      return;
    }
    // If we have labInfo, try to get the name
    if (labInfo) {
      // The name might be in different places in the response
      const labName = labInfo.name;
      console.log('Extracted lab name:', labName);
      
      if (labName) {
        setPrefix(labName);
      } else if (!loading) {
        // If no name found and not currently loading, try to refresh
        console.log('No lab name found, refreshing data...');
        refreshLabData();
      }
    } else if (!loading) {
      // If no labInfo and not loading, try to refresh
      console.log('No lab info available, refreshing data...');
      refreshLabData();
    }
  }, [labInfo, loading, refreshLabData]);
  
  // Debug logs
  useEffect(() => {
    console.log('Current prefix:', prefix);
    if (error) {
      console.error('Error in useLabPrefix:', error);
    }
  }, [prefix, error]);
  
  return prefix;
}
