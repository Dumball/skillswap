import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const useAuth = () => {
    const context = useContext(AuthContext);
    
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    
    return {
        user: context.user,
        token: context.token,
        loading: context.loading,
        login: context.login,
        register: context.register,
        logout: context.logout
    };
};

export default useAuth;
