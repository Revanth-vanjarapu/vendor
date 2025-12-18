export const isAuthenticated = () => {
  return !!localStorage.getItem("token");
};

export const getVendor = () => {
  const vendor = localStorage.getItem("vendor");
  return vendor ? JSON.parse(vendor) : null;
};

export const logout = () => {
  localStorage.clear();
  window.location.href = "/login";
};
