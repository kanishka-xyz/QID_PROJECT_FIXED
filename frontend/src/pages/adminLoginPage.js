import React, {
  useState
} from "react";

import {
  adminLogin
} from "../utils/adminApi";


function AdminLoginPage({
  navigate
}) {

  const [
    username,
    setUsername
  ] = useState("");

  const [
    password,
    setPassword
  ] = useState("");

  const [
    error,
    setError
  ] = useState("");

  const [
    loading,
    setLoading
  ] = useState(false);


  // =====================================================
  // LOGIN
  // =====================================================

  const handleLogin =
    async () => {

      setError("");

      if (!username.trim()) {

        setError(
          "Enter username or email"
        );

        return;
      }

      if (!password) {

        setError(
          "Enter password"
        );

        return;
      }

      try {

        setLoading(true);

        await adminLogin(
          username,
          password
        );

        // ===============================================
        // GO TO ADMIN RECORDS DASHBOARD
        // ===============================================

        navigate(
          "/admin/dashboard"
        );

      } catch (error) {

        console.error(
          error
        );

        setError(
          error?.response?.data?.detail ||
          "Invalid admin credentials"
        );

      } finally {

        setLoading(false);

      }

    };


  return (

    <div
      className="qid-page qid-admin-login"
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent:
          "center",
        alignItems:
          "center",
        background:
          "#f1f5f9",
      }}
    >

      <div
        style={{
          width: "380px",
          padding: "35px",
          background:
            "white",
          borderRadius:
            "10px",
          boxShadow:
            "0 10px 30px rgba(0,0,0,0.1)",
        }}
      >

        <div
          style={{
            color:
              "#2563eb",
            fontWeight:
              "900",
            letterSpacing:
              "2px",
            fontSize:
              "13px",
          }}
        >
          QID
        </div>


        <h1
          style={{
            marginBottom:
              "5px",
          }}
        >
          Admin Login
        </h1>


        <p
          style={{
            color:
              "#64748b",
            marginTop:
              "0",
            marginBottom:
              "25px",
          }}
        >
          Administrator Login
        </p>


        {/* USERNAME */}

        <input
          type="text"
          placeholder=
            "Username or Email"
          value={
            username
          }
          onChange={(e) =>
            setUsername(
              e.target.value
            )
          }
          style={{
            width:
              "100%",
            boxSizing:
              "border-box",
            padding:
              "12px",
            marginBottom:
              "15px",
            border:
              "1px solid #cbd5e1",
            borderRadius:
              "6px",
          }}
        />


        {/* PASSWORD */}

        <input
          type="password"
          placeholder="Password"
          value={
            password
          }
          onChange={(e) =>
            setPassword(
              e.target.value
            )
          }
          onKeyDown={(e) => {

            if (
              e.key ===
              "Enter"
            ) {

              handleLogin();

            }

          }}
          style={{
            width:
              "100%",
            boxSizing:
              "border-box",
            padding:
              "12px",
            marginBottom:
              "15px",
            border:
              "1px solid #cbd5e1",
            borderRadius:
              "6px",
          }}
        />


        {/* ERROR */}

        {error && (

          <div
            style={{
              color:
                "#dc2626",
              background:
                "#fee2e2",
              padding:
                "10px",
              borderRadius:
                "6px",
              marginBottom:
                "15px",
              fontSize:
                "14px",
            }}
          >
            {error}
          </div>

        )}


        {/* LOGIN */}

        <button
          onClick={
            handleLogin
          }
          disabled={
            loading
          }
          style={{
            width:
              "100%",
            padding:
              "12px",
            border:
              "none",
            borderRadius:
              "6px",
            background:
              "#2563eb",
            color:
              "white",
            fontWeight:
              "700",
            cursor:
              loading
                ? "not-allowed"
                : "pointer",
            opacity:
              loading
                ? 0.7
                : 1,
          }}
        >

          {loading
            ? "LOGGING IN..."
            : "LOGIN"}

        </button>

      </div>

    </div>
  );
}


export default AdminLoginPage;