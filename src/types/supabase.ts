export type Device = {
  id: string;
  user_id: string;
  device_code: string;
  name: string;
  created_at: string;
};

export type DeviceState = {
  id: string;
  device_id: string;
  state: 'happy' | 'focused' | 'tired' | 'sleep';
  productivity: number;
  productive_time: number; // in seconds
  neutral_time: number; // in seconds
  distracting_time: number; // in seconds
  current_activity: string;
  last_updated: string;
};

export type ProductivityLog = {
  id: string;
  device_id: string;
  date: string;
  // newer schema uses productivity_score; older records might still have productivity
  productivity?: number;
  productivity_score?: number;
  productive_time: number;
  neutral_time: number;
  distracting_time: number;
  app_usage: { [app: string]: number }; // app name -> seconds
};
