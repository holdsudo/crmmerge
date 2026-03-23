import { UserRole } from "@prisma/client";

type ScopedUser = {
  id: string;
  role: UserRole | "ADMIN" | "MANAGER" | "STAFF";
};

export function isPrivilegedRole(role: ScopedUser["role"]) {
  return role === "ADMIN" || role === "MANAGER";
}

export function dealAccessWhere(user: ScopedUser) {
  if (isPrivilegedRole(user.role)) {
    return {};
  }

  return {
    OR: [{ assignedStaffId: user.id }, { createdById: user.id }]
  };
}

export function customerAccessWhere(user: ScopedUser) {
  if (isPrivilegedRole(user.role)) {
    return {};
  }

  return {
    deals: {
      some: dealAccessWhere(user)
    }
  };
}

export function vendorAccessWhere(user: ScopedUser) {
  if (isPrivilegedRole(user.role)) {
    return {};
  }

  return {
    deals: {
      some: dealAccessWhere(user)
    }
  };
}

export function assertCanAssignUser(actor: ScopedUser, assignedStaffId?: string | null) {
  if (!assignedStaffId || isPrivilegedRole(actor.role) || assignedStaffId === actor.id) {
    return assignedStaffId || actor.id;
  }

  throw new Error("Staff users cannot assign deals to other users.");
}

export function assertStrongPassword(password: string) {
  if (password.length < 12) {
    throw new Error("Password must be at least 12 characters.");
  }
  if (!/[A-Z]/.test(password)) {
    throw new Error("Password must include at least one uppercase letter.");
  }
  if (!/[a-z]/.test(password)) {
    throw new Error("Password must include at least one lowercase letter.");
  }
  if (!/[0-9]/.test(password)) {
    throw new Error("Password must include at least one number.");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    throw new Error("Password must include at least one special character.");
  }
}
