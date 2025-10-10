import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import authService from '../services/authService';

interface Role {
  ID: number;
  Name: string;
  Position: string;
  PositionLevel: number;
}

export interface User {
  ID: number;
  Username: string;
  Email: string;
  RoleID: number;
  Role: Role;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchUserData = async () => {
            const userId = authService.getUserIdFromToken();
            if (userId) {
                try {
                    const userData = await authService.getUserById(userId);
                    setUser(userData);
                } catch (error) {
                    console.error("Gagal mengambil data pengguna:", error);
                    authService.logout(); 
                }
            }
            setIsLoading(false);
        };

        fetchUserData();
    }, []);

    const value = {
        user,
        isLoading
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export { AuthContext };