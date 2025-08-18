// src/GlobalStyles.js
import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Poppins:wght@600;700&family=Space+Mono:wght@400;700&display=swap');

    :root {
        --color-dark-bg: #111827;
        --color-dark-surface: #1f2937;
        --color-text-light: #f9fafb;
        --color-text-muted: #d1d5db;
        --color-accent-primary: #3b82f6;
        --color-accent-red: #ef4444;
        --spacing-lg: 1.5rem;
        --border-radius-lg: 0.75rem;
    }

    * {
        box-sizing: border-box;
    }

    body {
        margin: 0;
        padding: 0;
        font-family: 'Inter', sans-serif;
        background-color: var(--color-dark-bg);
        color: var(--color-text-light);
        line-height: 1.6;
        min-height: 100vh;
    }

    h1, h2, h3, h4, h5, h6 {
        font-family: 'Poppins', sans-serif;
        color: var(--color-text-light);
        font-weight: 700;
        line-height: 1.2;
    }

    a {
        text-decoration: none;
        color: var(--color-accent-primary);
        transition: color 0.2s ease-in-out;
    }

    .btn {
        font-family: 'Inter', sans-serif;
        font-weight: 600;
        cursor: pointer;
        border: none;
        border-radius: var(--border-radius-lg);
        padding: 0.75rem 1.5rem;
        transition: all 0.2s ease-in-out;
        text-align: center;
        text-decoration: none;
    }
    .btn-primary {
        background-color: var(--color-accent-primary);
        color: white;
    }
    .btn-primary:hover {
        background-color: #2563eb;
    }
    .btn-secondary {
        background-color: var(--color-dark-surface);
        color: var(--color-text-light);
        border: 1px solid var(--color-dark-border);
    }
    .btn-secondary:hover {
        background-color: #111827;
    }

    input, textarea, select {
        font-family: 'Space Mono', monospace;
        background-color: var(--color-dark-surface);
        color: var(--color-text-light);
        border: 1px solid var(--color-dark-border);
        border-radius: var(--border-radius-lg);
        padding: 0.75rem 1rem;
        outline: none;
        transition: all 0.2s ease-in-out;
    }
    input:focus, textarea:focus, select:focus {
        border-color: var(--color-accent-primary);
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
    }
`;