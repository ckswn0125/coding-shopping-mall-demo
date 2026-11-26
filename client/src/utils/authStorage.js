export function getStoredUser() {
  try {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function clearAuthStorage() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function saveUser(user) {
  localStorage.setItem("user", JSON.stringify(user));
}
