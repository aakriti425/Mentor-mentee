// Local calendar date as YYYY-MM-DD (toISOString() would give the UTC date, which is wrong before 5:30 AM in India)
export const today = () => new Date().toLocaleDateString("sv-SE");
export const isToday = (t) => Boolean(t) && new Date(t).toDateString() === new Date().toDateString();
