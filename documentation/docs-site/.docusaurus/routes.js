import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/__docusaurus/debug',
    component: ComponentCreator('/__docusaurus/debug', '5ff'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/config',
    component: ComponentCreator('/__docusaurus/debug/config', '5ba'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/content',
    component: ComponentCreator('/__docusaurus/debug/content', 'a2b'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/globalData',
    component: ComponentCreator('/__docusaurus/debug/globalData', 'c3c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/metadata',
    component: ComponentCreator('/__docusaurus/debug/metadata', '156'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/registry',
    component: ComponentCreator('/__docusaurus/debug/registry', '88c'),
    exact: true
  },
  {
    path: '/__docusaurus/debug/routes',
    component: ComponentCreator('/__docusaurus/debug/routes', '000'),
    exact: true
  },
  {
    path: '/docs',
    component: ComponentCreator('/docs', 'b75'),
    routes: [
      {
        path: '/docs',
        component: ComponentCreator('/docs', '427'),
        routes: [
          {
            path: '/docs',
            component: ComponentCreator('/docs', 'a94'),
            routes: [
              {
                path: '/docs/technical-guide/',
                component: ComponentCreator('/docs/technical-guide/', '552'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/technical-guide/architecture/',
                component: ComponentCreator('/docs/technical-guide/architecture/', 'cfb'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/technical-guide/architecture/docker-architecture',
                component: ComponentCreator('/docs/technical-guide/architecture/docker-architecture', 'a06'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/technical-guide/architecture/project-structure',
                component: ComponentCreator('/docs/technical-guide/architecture/project-structure', 'fc4'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/technical-guide/architecture/structure-review',
                component: ComponentCreator('/docs/technical-guide/architecture/structure-review', '1c0'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/technical-guide/backend/',
                component: ComponentCreator('/docs/technical-guide/backend/', '016'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/technical-guide/backend/database-sync',
                component: ComponentCreator('/docs/technical-guide/backend/database-sync', '8f6'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/technical-guide/backend/fix-summary',
                component: ComponentCreator('/docs/technical-guide/backend/fix-summary', '195'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/technical-guide/backend/index-fix-summary',
                component: ComponentCreator('/docs/technical-guide/backend/index-fix-summary', '15c'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/technical-guide/backend/sequelize-workflow',
                component: ComponentCreator('/docs/technical-guide/backend/sequelize-workflow', '0d0'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/technical-guide/backend/server-readme',
                component: ComponentCreator('/docs/technical-guide/backend/server-readme', '87a'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/technical-guide/deployment/',
                component: ComponentCreator('/docs/technical-guide/deployment/', 'cf6'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/technical-guide/deployment/ci-cd-plan',
                component: ComponentCreator('/docs/technical-guide/deployment/ci-cd-plan', '391'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/technical-guide/deployment/deployment-checklist',
                component: ComponentCreator('/docs/technical-guide/deployment/deployment-checklist', '2e9'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/technical-guide/deployment/pm2-cluster-setup',
                component: ComponentCreator('/docs/technical-guide/deployment/pm2-cluster-setup', '2cd'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/technical-guide/deployment/production-deployment',
                component: ComponentCreator('/docs/technical-guide/deployment/production-deployment', 'ea8'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/technical-guide/frontend/',
                component: ComponentCreator('/docs/technical-guide/frontend/', 'd1e'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/technical-guide/frontend/client-readme',
                component: ComponentCreator('/docs/technical-guide/frontend/client-readme', '2e5'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/technical-guide/frontend/error-boundary',
                component: ComponentCreator('/docs/technical-guide/frontend/error-boundary', 'b7c'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/technical-guide/security/',
                component: ComponentCreator('/docs/technical-guide/security/', '668'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/technical-guide/security/security-notes',
                component: ComponentCreator('/docs/technical-guide/security/security-notes', '9a6'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/user-guide/overview',
                component: ComponentCreator('/docs/user-guide/overview', '128'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/user-guide/roles/admin',
                component: ComponentCreator('/docs/user-guide/roles/admin', 'ef6'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/user-guide/roles/chemist',
                component: ComponentCreator('/docs/user-guide/roles/chemist', '080'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/user-guide/roles/doctor',
                component: ComponentCreator('/docs/user-guide/roles/doctor', '5dd'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/user-guide/roles/employee',
                component: ComponentCreator('/docs/user-guide/roles/employee', '449'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/user-guide/roles/patient',
                component: ComponentCreator('/docs/user-guide/roles/patient', '400'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/docs/user-guide/roles/receptionist',
                component: ComponentCreator('/docs/user-guide/roles/receptionist', '820'),
                exact: true,
                sidebar: "tutorialSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/',
    component: ComponentCreator('/', '2e1'),
    exact: true
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
