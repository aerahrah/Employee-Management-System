import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/authStore";
import Sidebar from "../components/sidebar";
import EmployeeDashboard from "../components/employeeDashboard/employeeDashboard";

const Dashboard = () => {
  const navigate = useNavigate();
  const { token, admin } = useAuth();
  const [showList, setShowList] = useState(false);
  useEffect(() => {
    if (!token) {
      navigate("/");
    }
  }, [token, navigate]);

  return (
    <div className="relative h-screen bg-neutral-200 w-screen">
      <Sidebar admin={admin} setShowList={setShowList} />
      <nav className="fixed ml-72 flex md:pl-[60%] sm:pl-[40%] pl-[20%] items-center border-l-2 border-neutral-200 bg-white w-[100%] h-20">
        <p className="text-xl">Hi {admin.username} </p>
      </nav>

      <div className="ml-72">{showList && <EmployeeDashboard />}</div>
    </div>
  );
};

export default Dashboard;
