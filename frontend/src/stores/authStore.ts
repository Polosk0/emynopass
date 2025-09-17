import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  
  login: (token: string, user: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ 
      user, 
      token, 
      isAuthenticated: true, 
      isLoading: false 
    });
  },
  
  logout: async () => {
    const { token } = get();
    
    // Appeler l'API de déconnexion si on a un token
    if (token) {
      try {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
      }
    }
    
    // Nettoyer le localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    set({ 
      user: null, 
      token: null, 
      isAuthenticated: false, 
      isLoading: false 
    });
  },
  
  checkAuth: async () => {
    set({ isLoading: true });
    
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (!storedToken || !storedUser) {
      set({ isLoading: false });
      return;
    }
    
    try {
      // Vérifier la validité du token
      const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${storedToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        set({ 
          user: data.user, 
          token: storedToken, 
          isAuthenticated: true, 
          isLoading: false 
        });
      } else {
        // Token invalide, nettoyer
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false, 
          isLoading: false 
        });
      }
    } catch (error) {
      console.error('Erreur vérification auth:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({ 
        user: null, 
        token: null, 
        isAuthenticated: false, 
        isLoading: false 
      });
    }
  },
  
  setLoading: (loading: boolean) => set({ isLoading: loading }),
}));