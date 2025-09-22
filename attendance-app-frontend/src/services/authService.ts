import axios from 'axios';

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

const authService = {
    login,
    logout,
    getCurrentUser,
};

export default authService;