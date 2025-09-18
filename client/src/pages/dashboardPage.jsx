import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/authStore";
import Sidebar from "../components/sidebar";
import { Outlet } from "react-router-dom";

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
    <div className="flex relative min-h-screen h-[100%] bg-neutral-200  w-full">
      <div className="w-72 ">
        <Sidebar admin={admin} setShowList={setShowList} />
      </div>

      <div className="flex-1">
        <nav className="fixed flex pl-[70%]  items-center  bg-white w-full h-20">
          <p className="text-xl">Hi {admin.username} </p>
        </nav>
        <Outlet />
      </div>
    </div>
  );
};

export default Dashboard;
