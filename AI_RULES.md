# AI Rules for POS Digital Printing Application

This document outlines the technical stack and specific library usage guidelines for developing the POS Digital Printing application.

## Tech Stack

*   **Frontend Framework**: React.js
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS for all UI styling.
*   **Build Tool**: Vite
*   **Icons**: Lucide React
*   **UI Components**: shadcn/ui (built on Radix UI and Tailwind CSS)
*   **Routing**: React Router (routes are managed in `src/App.tsx`)
*   **State Management**: React's built-in `useState` and `useContext` (if needed).
*   **Data Handling**: Dummy data from `src/utils/dummyData.ts` for now.

## Library Usage Rules

To maintain consistency and efficiency, please adhere to the following rules when using libraries:

*   **React**: Use React for all UI components and application logic.
*   **TypeScript**: All new and modified files must be written in TypeScript (`.tsx` or `.ts`).
*   **Tailwind CSS**: All styling must be done using Tailwind CSS utility classes. Avoid custom CSS files or inline styles unless absolutely necessary and explicitly approved.
*   **Lucide React**: Use icons exclusively from the `lucide-react` library.
*   **shadcn/ui**:
    *   Prioritize using pre-built components from `shadcn/ui` for common UI elements (e.g., buttons, forms, tables, modals).
    *   Do **NOT** modify the original `shadcn/ui` component files. If a component needs customization beyond what props allow, create a new component that wraps or extends the `shadcn/ui` component.
*   **React Router**: Use `react-router-dom` for all client-side routing. Keep the main routing configuration within `src/App.tsx`.
*   **File Structure**:
    *   Source code should always be in the `src` folder.
    *   Pages should be placed in `src/pages/`.
    *   Components should be placed in `src/components/`.
    *   Utility files should be placed in `src/utils/`.
    *   Always create a new file for every new component or hook. Do not add new components to existing files.
*   **Responsiveness**: All designs must be responsive and work well across different screen sizes (mobile, tablet, desktop).
*   **Error Handling**: Do not implement `try/catch` blocks for errors unless specifically requested. Errors should be allowed to bubble up for easier debugging.
*   **Simplicity**: Keep the code simple and elegant. Avoid over-engineering or adding features not explicitly requested.