import { api } from '@/api/client';
import type { ConnectedDevice } from '@/types/api';

export const getDevices = async (): Promise<ConnectedDevice[]> => {
  const data = await api.get<{ devices: ConnectedDevice[] }>('/api/v1/devices');
  return data.devices;
};

/**
 * Sign one device out. `signed_out_self` is true when the device revoked was
 * this one — the caller has to clear the session rather than carry on with
 * tokens the server has just discarded.
 */
export const revokeDevice = (
  id: string,
): Promise<{ signed_out_self: boolean }> =>
  api.delete(`/api/v1/devices/${id}`);

/** Sign out everything except this device. Returns how many were ended. */
export const revokeOtherDevices = (): Promise<{ signed_out: number }> =>
  api.delete('/api/v1/devices/others');
