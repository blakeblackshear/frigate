import { API_HOST } from '../env';
export const baseUrl = API_HOST || `${window.location.protocol}//${window.location.host}${window.baseUrl || '/'}`;
