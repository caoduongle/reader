import React from 'react';

export interface AdminUser {
  id?: string;
  email?: string;
  role?: string;
}

export interface AdminGuardProps {
  children: React.ReactNode;
  user?: AdminUser | null;
  fallback?: React.ReactNode;
}

/**
 * Client-Side Admin Guard (FR-004)
 * Blocks unauthorized or non-admin users from rendering administrative UI views.
 */
export const AdminGuard: React.FC<AdminGuardProps> = ({
  children,
  user,
  fallback = (
    <div className="flex items-center justify-center p-8 text-center text-red-500">
      <p>Truy cập bị từ chối: Yêu cầu quyền quản trị viên.</p>
    </div>
  ),
}) => {
  if (!user || user.role !== 'admin') {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default AdminGuard;
