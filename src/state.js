// State Management (Vanilla JS)

export const state = {
    currentUser: JSON.parse(localStorage.getItem('lufit_user')) || null,
    theme: localStorage.getItem('lufit_theme') || 'dark',
    userProfile: null,
    routines: [],
    currentRoutineId: null,
    weeks: [],
    currentWeekId: null,
    currentDay: 1,
    currentExercises: [],
    dayTitles: {},
    dayOrder: [],
    currentView: 'dashboard',
    expandedExercises: [] // Track expanded exercise IDs
};

export function setCurrentUser(user) {
    state.currentUser = user;
    if (user) {
        localStorage.setItem('lufit_user', JSON.stringify(user));
    } else {
        localStorage.removeItem('lufit_user');
    }
}
