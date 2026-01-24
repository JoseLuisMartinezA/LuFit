// State Management (Vanilla JS)

export const state = {
    currentUser: JSON.parse(localStorage.getItem('lufit_user')) || null,
    userProfile: null,
    routines: [],
    currentRoutineId: null,
    weeks: [],
    currentWeekId: null,
    currentDay: 1,
    currentExercises: [],
    dayTitles: {},
    currentView: 'dashboard'
};

export function setCurrentUser(user) {
    state.currentUser = user;
    if (user) {
        localStorage.setItem('lufit_user', JSON.stringify(user));
    } else {
        localStorage.removeItem('lufit_user');
    }
}
