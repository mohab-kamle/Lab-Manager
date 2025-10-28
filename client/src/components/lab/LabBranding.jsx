import React, { useEffect, useState } from 'react';
import { useLab } from '../context/LabContext';
import './LabBranding.css';

const LabBranding = ({ children }) => {
  const { labInfo, labSettings } = useLab();
  const [customStyles, setCustomStyles] = useState('');

  useEffect(() => {
    if (labInfo || labSettings) {
      applyLabBranding();
    }
  }, [labInfo, labSettings]);

  const applyLabBranding = () => {
    let styles = '';
    
    // Apply primary color
    if (labInfo?.primary_color) {
      styles += `
        :root {
          --primary-color: ${labInfo.primary_color};
          --primary-hover: ${adjustBrightness(labInfo.primary_color, -10)};
        }
      `;
    }
    
    // Apply secondary color
    if (labInfo?.secondary_color) {
      styles += `
        :root {
          --secondary-color: ${labInfo.secondary_color};
        }
      `;
    }
    
    // Apply custom branding from settings
    if (labSettings) {
      const brandingColors = labSettings.find(s => s.setting_key === 'branding_colors');
      if (brandingColors?.setting_value) {
        try {
          const colors = JSON.parse(brandingColors.setting_value);
          if (colors.primary) {
            styles += `
              :root {
                --primary-color: ${colors.primary};
                --primary-hover: ${adjustBrightness(colors.primary, -10)};
              }
            `;
          }
          if (colors.secondary) {
            styles += `
              :root {
                --secondary-color: ${colors.secondary};
              }
            `;
          }
        } catch (error) {
          console.error('Error parsing branding colors:', error);
        }
      }
    }
    
    setCustomStyles(styles);
  };

  const adjustBrightness = (hex, percent) => {
    const num = parseInt(hex.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  };

  return (
    <>
      {customStyles && (
        <style dangerouslySetInnerHTML={{ __html: customStyles }} />
      )}
      <div className={`lab-branding ${labInfo?.subdomain || 'default'}`}>
        {children}
      </div>
    </>
  );
};

export default LabBranding; 