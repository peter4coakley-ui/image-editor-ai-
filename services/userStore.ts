import { UserProfile } from '../types';

const USER_STORAGE_KEY = 'realtor_suite_user';

const defaultUser: UserProfile = {
    credits: 50,
    plan: 'FREE'
};

export const getUserProfile = (): UserProfile => {
    try {
        const stored = localStorage.getItem(USER_STORAGE_KEY);
        return stored ? JSON.parse(stored) : defaultUser;
    } catch (e) {
        return defaultUser;
    }
};

export const deductCredits = (amount: number): boolean => {
    const user = getUserProfile();
    if (user.credits >= amount) {
        user.credits -= amount;
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
        // Dispatch event for UI update
        window.dispatchEvent(new Event('user-update'));
        return true;
    }
    return false;
};

export const addCredits = (amount: number) => {
    const user = getUserProfile();
    user.credits += amount;
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event('user-update'));
};

export const getCostForWorkflow = (type: string): number => {
    if (type.includes('BATCH')) return 5; 
    if (type.includes('VIDEO')) return 10;
    return 1; 
};
