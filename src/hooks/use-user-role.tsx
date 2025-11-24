import { useEffect, useState } from "react";

export type UserRole = "admin" | "gestor" | null;

interface UserProfile {
  role: UserRole;
  full_name: string;
  id: string;
}

export function useUserRole() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = () => {
    try {
      const user = localStorage.getItem("user");

      if (!user) {
        setProfile(null);
        setIsLoading(false);
        return;
      }

      const userData = JSON.parse(user);
      setProfile({
        id: userData.id,
        full_name: userData.full_name,
        role: userData.role,
      });
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const isAdmin = profile?.role === "admin";
  const isGestor = profile?.role === "gestor";
  const hasRole = (role: UserRole) => profile?.role === role;

  return {
    profile,
    isLoading,
    isAdmin,
    isGestor,
    hasRole,
    role: profile?.role || null,
  };
}
