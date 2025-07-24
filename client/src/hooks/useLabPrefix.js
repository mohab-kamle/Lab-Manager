import { useLab } from '../context/LabContext';

/**
 * Returns current lab name from the LabContext.
 * If no lab name exists, returns an empty string.
 */
export default function useLabPrefix() {
  const { labInfo } = useLab();
  return labInfo?.name || '';
}
