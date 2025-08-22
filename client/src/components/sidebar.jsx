import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getEmployees } from "../api/employee";
import { useNavigate } from "react-router-dom";

const Sidebar = ({ admin, setShowList }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const menuItems = [
    { name: "Employees", path: "employees" },
    { name: "General Settings", path: "settings" },
    { name: "Admin Management", path: "admin" },
  ];
  const [activeItem, setActiveItem] = useState();

  const { mutateAsync, isPending, isSuccess, isError } = useMutation({
    mutationFn: getEmployees,
    onSuccess: (data) => {
      queryClient.setQueryData(["employees"], data);
      console.log(data);
    },
  });
  console.log(isSuccess);
  const employees = queryClient.getQueryData(["employees"]);

  const handleClick = async (item) => {
    setActiveItem(item.name);

    if (item.name === "Employees") {
      try {
        await mutateAsync();

        navigate(item.path);
        console.log(item.path);
      } catch (error) {
        console.error("Failed to fetch employees:", error);
      }
    }
  };
  return (
    <div className="fixed h-screen bg-white w-72 l-0">
      <ul className="mt-20 flex flex-col gap-2 ">
        {menuItems.map((item) => (
          <li
            key={item.name}
            onClick={() => handleClick(item)}
            className={`  font-semibold  cursor-pointer transition-colors duration-150 border-b-1  border-neutral-300
              ${
                activeItem === item.name
                  ? "bg-neutral-800 text-neutral-200"
                  : "bg-white hover:text-neutral-200 hover:bg-neutral-800 text-neutral-700"
              }`}
          >
            <p className="mx-2 p-5 "> {item.name}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;
