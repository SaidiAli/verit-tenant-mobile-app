export const tenantKeys = {
  root: (userId: string | undefined) => ['tenant', userId] as const,
  query: (userId: string | undefined, resource: string, id?: string | null) =>
    id === undefined ? ['tenant', userId, resource] as const : ['tenant', userId, resource, id] as const,
};
