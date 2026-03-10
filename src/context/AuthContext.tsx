import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import api from "../api/client";

interface User {
    id: number;
    email: string;
    full_name: string | null;
    is_active: boolean;
    role: string;
    avatar_url?: string | null;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem("zeron_token"));
    const [isLoading, setIsLoading] = useState(true);

    // Set up axios interceptor to include token
    useEffect(() => {
        const reqInterceptor = api.interceptors.request.use((config) => {
            const storedToken = localStorage.getItem("zeron_token");
            if (storedToken) {
                config.headers.Authorization = `Bearer ${storedToken}`;
            }
            return config;
        });
        // Auto-logout on 401 (expired token)
        const resInterceptor = api.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
                    localStorage.removeItem("zeron_token");
                    setToken(null);
                    setUser(null);
                }
                return Promise.reject(error);
            }
        );
        return () => {
            api.interceptors.request.eject(reqInterceptor);
            api.interceptors.response.eject(resInterceptor);
        };
    }, []);

    // Validate token on mount
    useEffect(() => {
        const validateToken = async () => {
            const storedToken = localStorage.getItem("zeron_token");
            if (!storedToken) {
                setIsLoading(false);
                return;
            }
            try {
                const res = await api.get("/auth/me", {
                    headers: { Authorization: `Bearer ${storedToken}` },
                });
                setUser(res.data);
                setToken(storedToken);
            } catch {
                // Token invalid or expired
                localStorage.removeItem("zeron_token");
                setToken(null);
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };
        validateToken();
    }, []);

    const login = async (email: string, password: string) => {
        const res = await api.post("/auth/login", { email, password });
        const { access_token, user: userData } = res.data;
        localStorage.setItem("zeron_token", access_token);
        setToken(access_token);
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem("zeron_token");
        setToken(null);
        setUser(null);
    };

    const refreshUser = async () => {
        try {
            const res = await api.get("/auth/me");
            setUser(res.data);
        } catch { }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isAuthenticated: !!token && !!user,
                isLoading,
                login,
                logout,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
