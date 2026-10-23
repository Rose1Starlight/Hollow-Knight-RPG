/**
 * Register custom Handlebars helpers for the Hollow Knight RPG system
 */
export function registerHandlebarsHelpers() {
    // Equality check
    Handlebars.registerHelper("eq", (a, b) => a === b);

    // Less than comparison
    Handlebars.registerHelper("lt", (a, b) => a < b);

    // Greater than comparison
    Handlebars.registerHelper("gt", (a, b) => a > b);

    // Range helper for loops (generates array [0, 1, 2, ..., n-1])
    Handlebars.registerHelper("range", (n) => {
        if (typeof n !== "number" || n <= 0) return [];
        return Array.from({ length: Math.floor(n) }, (_, i) => i);
    });

    // Capitalize first letter
    Handlebars.registerHelper("capitalize", (str) => {
        if (!str) return "";
        return str.charAt(0).toUpperCase() + str.slice(1);
    });

    // Join array with separator
    Handlebars.registerHelper("join", (arr, sep) => {
        if (!Array.isArray(arr)) return "";
        return arr.join(sep || ", ");
    });

    // Math operations
    Handlebars.registerHelper("add", (a, b) => a + b);
    Handlebars.registerHelper("subtract", (a, b) => a - b);
    Handlebars.registerHelper("multiply", (a, b) => a * b);
    Handlebars.registerHelper("divide", (a, b) => (b !== 0 ? a / b : 0));

    // Conditional class helper
    Handlebars.registerHelper("ifClass", (condition, className) => {
        return condition ? className : "";
    });
}