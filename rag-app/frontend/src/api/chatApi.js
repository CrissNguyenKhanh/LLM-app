function resolveApiBaseUrl() {
  const explicit = import.meta.env.VITE_API_BASE_URL?.trim();
  if (explicit) {
    return explicit;
  }

  if (typeof window !== "undefined" && window.location?.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }

  return "http://127.0.0.1:5000";
}

const API_BASE_URL = resolveApiBaseUrl();

async function parseJson(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (error) {
    throw new Error(`Phan hoi khong phai JSON hop le: ${text.slice(0, 200)}`);
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...options,
  });
  const payload = await parseJson(response);

  if (!response.ok) {
    throw new Error(
      payload.error || payload.message || `Request that bai (${response.status})`
    );
  }

  return payload;
}

export async function fetchHealth() {
  return request("/api/health");
}

export async function sendChat(question) {
  return request("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({ question }),
  });
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append("file", file);

  return request("/api/upload", {
    method: "POST",
    body: formData,
  });
}

export async function registerUser(form) {
  return request("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify(form),
  });
}

export async function loginUser(form) {
  return request("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify(form),
  });
}

export async function fetchCurrentUser() {
  return request("/api/auth/me");
}

export async function logoutUser() {
  return request("/api/auth/logout", {
    method: "POST",
  });
}

export { API_BASE_URL };
