import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const API_URL = 'http://localhost:8080/api/';

interface AuthResponse {
    token: string;
}

const login = (username: String, password: String) => {
    return axios
        .post<AuthResponse>(API_URL + 'login', {
            username,
            password,
        })
        .then((response) => {
            if (response.data.token) {
                localStorage.setItem('user', JSON.stringify(response.data));
            }
            return response.data;
        });
};

const logout = () => {
    localStorage.removeItem('user');
};

const getCurrentUser = (): AuthResponse | null => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        return JSON.parse(userStr) as AuthResponse;
    }
    return null;
};

const authHeader = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        const user = JSON.parse(userStr);
        if (user && user.token) {
            return { Authorization: 'Bearer ' + user.token };
        }
    }
    return {};
};

const getUserIdFromToken = (): number | null => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        const user = JSON.parse(userStr);
        if (user && user.token) {
            try {
                const decodedToken: { id: number } = jwtDecode(user.token);
                return decodedToken.id;
            } catch (error) {
                console.error("Invalid token:", error);
                return null;
            }
        }
    }
    return null;
};

const getUserById = (id: number) => {
    return axios.get(API_URL + `admin/users/${id}`, { headers: authHeader() })
        .then(response => response.data);
};


const authService = {
    login,
    logout,
    getCurrentUser,
    getUserIdFromToken,
    getUserById
};

export default authService;