export const ENV = import.meta.env.MODE;
export const API_HOST = ENV === 'production' ? '' : 'http://192.168.50.106:5000/';
