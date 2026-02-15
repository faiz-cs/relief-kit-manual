export function isAdminLoggedIn() {
  return !!localStorage.getItem('adminToken');
}
