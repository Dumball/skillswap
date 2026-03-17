import React, { createContext, useState, useEffect } from 'react';
import apiService from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const verifyUser = async () => {
            if (token) {
                try {
                    const res = await apiService.getMe();
                    setUser(res.data);
                } catch (error) {
                    console.error("Token verification failed:", error);
                    logout();
                }
            }
            setLoading(false);
        };
        verifyUser();
    }, [token]);

    const login = async (email, password) => {
        const res = await apiService.login({ email, password });
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
        return res.data;
    };

    const register = async (name, email, password, autoSuffix = false) => {
        const res = await apiService.register({ name, email, password, auto_suffix: autoSuffix });
        localStorage.setItem('token', res.data.token);
        setToken(res.data.token);
        setUser(res.data.user);
        return res.data;
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
