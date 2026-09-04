import React from 'react';

export interface AuthUser {
  id?: string;
  email?: string;
}

export interface AuthGuardProps {
  children: React.ReactNode;
  user?: AuthUser | null;
  fallback?: React.ReactNode;
}

/**
 * Client-Side Authentication Guard (FR-005)
 * Blocks unauthenticated visitors from accessing private reader components.
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  user,
  fallback = (
    <div className="flex items-center justify-center p-8 text-center text-amber-600">
      <p>Vui lòng đăng nhập để truy cập tính năng này.</p>
    </div>
  ),
}) => {
  if (!user) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default AuthGuard;
