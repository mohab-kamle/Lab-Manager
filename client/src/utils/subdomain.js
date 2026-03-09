export const getSubdomain = () => {
    const host = window.location.hostname;
    const parts = host.split('.');

    // Localhost logic (biolab.localhost)
    if (parts.length === 2 && parts[1].startsWith('localhost')) {
        if (parts[0] === 'www') return null;
        return parts[0];
    }

    // Production logic (biolab.domain.com)
    if (parts.length > 2) {
        const subdomain = parts[0];
        if (['www', 'api'].includes(subdomain)) return null;
        return subdomain;
    }

    return null; // Main Landing Page
};
