import api from './api';
import type { ApiResponse } from '../types';

export type IdentitySide = 'front' | 'back';
export interface TenantIdentity {
  tenantId: string;
  tin: string | null;
  nin: string | null;
  images: Record<IdentitySide, boolean>;
  updatedAt: string | null;
}
export interface IdentityPicture { uri: string; name: string; type: string }
export const tenantIdentityApi = {
  read: async () => (await api.get<ApiResponse<TenantIdentity>>('/tenant/identity')).data.data!,
  update: async (fields: { tin?: string | null; nin?: string | null }) =>
    (await api.patch<ApiResponse<TenantIdentity>>('/tenant/identity', fields)).data.data!,
  upload: async (side: IdentitySide, picture: IdentityPicture, onProgress: (percent: number) => void) => {
    const body = new FormData();
    body.append('document', { uri: picture.uri, name: picture.name, type: picture.type } as any);
    return (await api.put<ApiResponse<TenantIdentity>>(`/tenant/identity/images/${side}`, body, {
      headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000,
      onUploadProgress: event => onProgress(Math.round(event.loaded * 100 / (event.total || event.loaded || 1))),
    })).data.data!;
  },
  remove: async (side: IdentitySide) =>
    (await api.delete<ApiResponse<TenantIdentity>>(`/tenant/identity/images/${side}`)).data.data!,
  download: async (side: IdentitySide) =>
    (await api.get<ApiResponse<{ url: string; expiresIn: number }>>(`/tenant/identity/images/${side}/download`)).data.data!,
};
