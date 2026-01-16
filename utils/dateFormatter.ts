import { Timestamp } from 'firebase/firestore';

export const formatDate = (dateInput: Date | Timestamp | string | number | null | undefined): string => {
    if (!dateInput) return '';

    let date: Date;

    if (dateInput instanceof Timestamp) {
        date = dateInput.toDate();
    } else if (typeof dateInput === 'object' && 'seconds' in dateInput) {
        // Handle Firestore timestamp-like objects
        date = new Date((dateInput as any).seconds * 1000);
    } else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
        date = new Date(dateInput);
    } else if (dateInput instanceof Date) {
        date = dateInput;
    } else {
        return '';
    }

    const now = new Date();
    const isCurrentYear = date.getFullYear() === now.getFullYear();

    const options: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    };

    if (!isCurrentYear) {
        options.year = 'numeric';
    }

    return date.toLocaleString('vi-VN', options);
};

// Also export a variant without time if needed, or just use one standard.
// User said "bỏ hiển thị năm đi", usually keeping time is desired for comments/posts.
// If typical format is "15:20 15 tháng 1, 2026", removing year makes it "15:20 15 tháng 1".
