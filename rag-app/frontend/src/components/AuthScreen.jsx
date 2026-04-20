import React, { useState } from "react";

const INITIAL_FORM = {
  username: "",
  display_name: "",
  password: "",
};

export default function AuthScreen({ mode, onModeChange, onSubmit, loading, error }) {
  const [form, setForm] = useState(INITIAL_FORM);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(form);
  }

  return (
    <div className="auth-shell">
      <section className="auth-hero">
        <div className="auth-hero-badge">ChatGPT Style RAG Workspace</div>
        <h1>Dang nhap de tro chuyen, upload file va truy xuat noi dung.</h1>
        <p>
          Giao dien da duoc doi thanh layout sidebar + khung chat trung tam, dong thoi
          bo sung tai khoan de tach phien lam viec theo tung nguoi dung.
        </p>
        <div className="auth-hero-points">
          <span>Dang nhap va dang ky bang session cookie</span>
          <span>Chat va upload chi hoat dong sau khi xac thuc</span>
          <span>Hoi thoai duoc luu local theo tung username</span>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-tabs">
          <button
            type="button"
            className={mode === "login" ? "auth-tab active" : "auth-tab"}
            onClick={() => onModeChange("login")}
          >
            Dang nhap
          </button>
          <button
            type="button"
            className={mode === "register" ? "auth-tab active" : "auth-tab"}
            onClick={() => onModeChange("register")}
          >
            Dang ky
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>{mode === "login" ? "Chao mung tro lai" : "Tao tai khoan moi"}</h2>
          <p className="auth-copy">
            {mode === "login"
              ? "Su dung tai khoan de vao workspace chat."
              : "Tao tai khoan local de bat dau su dung ung dung."}
          </p>

          <label>
            <span>Username</span>
            <input
              type="text"
              value={form.username}
              onChange={(event) => updateField("username", event.target.value)}
              placeholder="vd: admin"
              autoComplete="username"
            />
          </label>

          {mode === "register" ? (
            <label>
              <span>Ten hien thi</span>
              <input
                type="text"
                value={form.display_name}
                onChange={(event) => updateField("display_name", event.target.value)}
                placeholder="Ten cua ban"
                autoComplete="nickname"
              />
            </label>
          ) : null}

          <label>
            <span>Mat khau</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              placeholder="Toi thieu 6 ky tu"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>

          {error ? <div className="auth-error">{error}</div> : null}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? "Dang xu ly..." : mode === "login" ? "Dang nhap" : "Dang ky"}
          </button>
        </form>
      </section>
    </div>
  );
}
