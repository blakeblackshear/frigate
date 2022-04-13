export const ENV = import.meta.env.MODE;
export const API_HOST = ENV === "production" ? "" : "http://localhost:5000";
