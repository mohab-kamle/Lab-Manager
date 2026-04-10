---
sidebar_position: 3
title: Frontend Overview
---

# Frontend

This section covers the LabManager frontend — a React single-page application built with Vite, featuring role-based dashboards, medical report interfaces, and a modern UI with React-Bootstrap and Framer Motion animations.

## Key Areas

- **Role-Based Routing:** The application dynamically routes users to the correct dashboard based on their authenticated role (admin, chemist, doctor, employee, receptionist, or patient).
- **State Management:** Uses React Context for global state (authentication, lab context, theme) with component-level state for UI interactions.
- **UI Framework:** React-Bootstrap provides the component library, enhanced with custom CSS variables for consistent lab branding and theming (light/dark mode).
- **Code Splitting:** Lazy-loaded routes with React Suspense for optimized initial load times.

## In This Section

- **[Client README](./client-readme)** — Setup instructions, environment variables, and how to run the frontend locally.
- **[Error Boundary](./error-boundary)** — How the application handles runtime errors gracefully with fallback UI components.
