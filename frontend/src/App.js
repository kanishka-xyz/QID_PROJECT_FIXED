import React, {
  useCallback,
  useState,
} from "react";
import AdminLoginPage from "./pages/adminLoginPage";

import LoginPage from "./pages/loginPage";
import InspectionPage from "./pages/inspectionPage";
import RecordsPage from "./pages/RecordsPage";
import OP60Page from "./pages/OP60Page";
import AdminOperatorsPage from "./pages/AdminOperatorsPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import PDIPage from "./pages/PDIPage";
import FrameHistoryPage from "./pages/FrameHistoryPage";
import FirewallPage from "./pages/firewall";
import DockPage from "./pages/dockPages";

function App() {
  const [path, setPath] = useState(
    window.location.pathname === "/"
      ? "/login"
      : window.location.pathname
  );

  const navigate = useCallback(
    (newPath) => {
      window.history.pushState(
        {},
        "",
        newPath
      );

      setPath(newPath);
    },
    []
  );

  // =====================================================
  // LOGIN
  // =====================================================

  if (path === "/login") {
    return <LoginPage navigate={navigate} />;
  }
  // =====================================================
// ADMIN LOGIN
// =====================================================

if (path === "/admin/login") {
  return (
    <AdminLoginPage
      navigate={navigate}
    />
  );
}
  // =====================================================
  // ADMIN DASHBOARD
  // =====================================================

  if (path === "/admin/dashboard") {
    return (
      <AdminDashboardPage
        navigate={navigate}
      />
    );
  }

  // =====================================================
  // ADMIN OPERATORS
  // =====================================================

  if (path === "/admin/operators") {
    return (
      <AdminOperatorsPage
        navigate={navigate}
      />
    );
  }

  // =====================================================
  // OP60 RECORDS
  // =====================================================

  if (path === "/records") {
    return (
      <RecordsPage
        navigate={navigate}
      />
    );
  }

  // =====================================================
  // OP60
  // =====================================================

  if (path === "/op60") {
    return (
      <OP60Page
        navigate={navigate}
      />
    );
  }

  // =====================================================
  // PDI STATION 3
  // =====================================================

  if (path === "/pdi/station-3") {
    return (
      <PDIPage
        navigate={navigate}
        station="PDI_STATION_3"
      />
    );
  }

  if (path === "/admin/frame-history") {
    return <FrameHistoryPage navigate={navigate} />;
  }

  if (path === "/firewall") {
  return <FirewallPage navigate={navigate} />;
  }

  // =====================================================
// DOCK STATIONS
// =====================================================

if (
  path === "/dock"
) {
  return (
    <DockPage
      navigate={navigate}
    />
  );
}
  // =====================================================
  // OPERATOR AUTHENTICATION
  // =====================================================

  const isOperatorLoggedIn =
    !!localStorage.getItem(
      "operator_token"
    );

  if (!isOperatorLoggedIn) {
    return (
      <LoginPage
        navigate={navigate}
      />
    );
  }
  

  // =====================================================
  // OP40
  // =====================================================

  return (
    <InspectionPage
      navigate={navigate}
    />
  );
}



export default App;