import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import BookingPage from "./booking/BookingPage";
import AdminLogin from "./admin/AdminLogin"
import AdminDashboard from "./admin/AdminDashboard"

function App() {

  return (
    <Router>

      <Routes>

        <Route
          path="/"
          element={<Dashboard />}
        />
        <Route 
          path="/admin" 
          element={<AdminLogin/>}/>
        <Route 
          path="/admin/dashboard" 
          element={<AdminDashboard/>}/>    
        <Route
          path="/booking"
          element={<BookingPage />}
        />

      </Routes>

    </Router>
  );

}

export default App;