/**
 * Utility Helpers
 */

export const utils = {
    /**
     * Get Local Time formatted for datetime-local input (YYYY-MM-DDTHH:mm)
     */
    getLocalISOString: (date = new Date()) => {
        return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    },

    /**
     * Format date for display (e.g., 2 APR (THU))
     */
    formatDate: (timestamp) => {
        const date = new Date(timestamp);
        const day = date.getDate();
        const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
        const weekday = date.toLocaleString('en-US', { weekday: 'short' }).toUpperCase();
        return `${day} ${month} (${weekday})`;
    },

    /**
     * Format time for display
     */
    formatTime: (timestamp) => {
        return new Date(timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
};
