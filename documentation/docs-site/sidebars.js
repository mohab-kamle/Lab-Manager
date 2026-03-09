// @ts-check

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.

 @type {import('@docusaurus/plugin-content-docs').SidebarsConfig}
 */
const sidebars = {
  tutorialSidebar: [
    {
      type: 'category',
      label: 'User Guide',
      items: [
        'user-guide/overview',
        {
          type: 'category',
          label: 'Roles',
          items: [
            'user-guide/roles/admin',
            'user-guide/roles/chemist',
            'user-guide/roles/doctor',
            'user-guide/roles/employee',
            'user-guide/roles/receptionist',
            'user-guide/roles/patient'
          ]
        }
      ]
    },
    {
      type: 'category',
      label: 'Technical Guide',
      items: [
        'technical-guide/index',
        {
          type: 'category',
          label: 'Architecture',
          items: [
            'technical-guide/architecture/index',
            'technical-guide/architecture/project-structure',
            'technical-guide/architecture/docker-architecture',
            'technical-guide/architecture/structure-review'
          ]
        },
        {
          type: 'category',
          label: 'Backend',
          items: [
            'technical-guide/backend/index',
            'technical-guide/backend/server-readme',
            'technical-guide/backend/database-sync',
            'technical-guide/backend/sequelize-workflow',
            'technical-guide/backend/fix-summary',
            'technical-guide/backend/index-fix-summary'
          ]
        },
        {
          type: 'category',
          label: 'Frontend',
          items: [
            'technical-guide/frontend/index',
            'technical-guide/frontend/client-readme',
            'technical-guide/frontend/error-boundary'
          ]
        },
        {
          type: 'category',
          label: 'Deployment',
          items: [
            'technical-guide/deployment/index',
            'technical-guide/deployment/ci-cd-plan',
            'technical-guide/deployment/deployment-checklist',
            'technical-guide/deployment/pm2-cluster-setup',
            'technical-guide/deployment/production-deployment'
          ]
        },
        {
          type: 'category',
          label: 'Security',
          items: [
            'technical-guide/security/index',
            'technical-guide/security/security-notes'
          ]
        }
      ]
    }
  ],
};

export default sidebars;
