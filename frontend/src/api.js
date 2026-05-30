const BASE = '/api';

function getToken() {
  return localStorage.getItem('vms_token') || '';
}

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + getToken()
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (res.status === 401) {
    localStorage.removeItem('vms_token');
    localStorage.removeItem('vms_user');
    window.location.href = '/login';
    return null;
  }
  return res.json();
}

export const api = {
  login: (username, password) => req('POST', '/auth/login', { username, password }),
  getVisitors: () => req('GET', '/visitors'),
  addVisitor: (data) => req('POST', '/visitors', data),
  updateVisitor: (id, data) => req('PUT', `/visitors/${id}`, data),
  deleteVisitor: (id) => req('DELETE', `/visitors/${id}`),
  approveVisitorApi: (id) => req('PUT', `/visitors/${id}/approve`, {}),
  // Notifications
  getNotifications: () => req('GET', '/notifications'),
  getNotifCount: () => req('GET', '/notifications/count'),
  markNotifRead: (id) => req('PUT', `/notifications/${id}/read`, {}),
  markAllRead: () => req('PUT', '/notifications/read-all', {}),
  getHosts: () => req('GET', '/hosts'),
  addHost: (data) => req('POST', '/hosts', data),
  updateHost: (id, data) => req('PUT', `/hosts/${id}`, data),
  deleteHost: (id) => req('DELETE', `/hosts/${id}`),
  getScheduled: () => req('GET', '/scheduled'),
  addScheduled: (data) => req('POST', '/scheduled', data),
  updateScheduled: (id, data) => req('PUT', `/scheduled/${id}`, data),
  deleteScheduled: (id) => req('DELETE', `/scheduled/${id}`),
  getBlacklist: () => req('GET', '/blacklist'),
  addBlacklist: (data) => req('POST', '/blacklist', data),
  updateBlacklist: (id, data) => req('PUT', `/blacklist/${id}`, data),
  deleteBlacklist: (id) => req('DELETE', `/blacklist/${id}`),
  getLocations: () => req('GET', '/locations'),
  addLocation: (data) => req('POST', '/locations', data),
  updateLocation: (id, data) => req('PUT', `/locations/${id}`, data),
  deleteLocation: (id) => req('DELETE', `/locations/${id}`),
  getSettings: () => req('GET', '/settings'),
  saveSettings: (settings) => req('PUT', '/settings', { settings }),
  addOption: (type, value) => req('POST', '/settings/options', { type, value }),
  deleteOption: (type, value) => req('DELETE', '/settings/options', { type, value }),
  // Users
  getUsers: () => req('GET', '/users'),
  addUser: (data) => req('POST', '/users', data),
  updateUser: (id, data) => req('PUT', `/users/${id}`, data),
  deleteUser: (id) => req('DELETE', `/users/${id}`),
  // WhatsApp
  waStatus:     ()         => req('GET',  '/whatsapp/status'),
  waConnect:    ()         => req('POST', '/whatsapp/connect', {}),
  waDisconnect: ()         => req('POST', '/whatsapp/disconnect', {}),
  waTest:       (phone)    => req('POST', '/whatsapp/test', { phone }),
  waGetSettings:()         => req('GET',  '/whatsapp/settings'),
  waSaveSettings:(data)    => req('PUT',  '/whatsapp/settings', data),
  waSend:       (phone, message) => req('POST', '/whatsapp/send', { phone, message }),
  waHostPhone:  (name)     => req('GET',  `/whatsapp/host-phone?name=${encodeURIComponent(name)}`),
};
