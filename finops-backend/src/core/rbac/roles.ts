export type Role = 'ADMIN' | 'FINANCE' | 'TEAM_LEAD';
export const RolesHierarchy: Record<Role, number> = {
  ADMIN: 3,
  FINANCE: 2,
  TEAM_LEAD: 1,
};
