import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getEmployees } from "../api/employee";

const Sidebar = ({ admin, setShowList }) => {
  const queryClient = useQueryClient();

  const menuItems = ["Employees", "General Settings", "Admin Management"];
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
    setActiveItem(item);

    if (item === "Employees") {
      try {
        await mutateAsync();

        setShowList(true);
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
            key={item}
            onClick={() => handleClick(item)}
            className={`  font-semibold  cursor-pointer transition-colors duration-150 border-b-1  border-neutral-300
              ${
                activeItem === item
                  ? "bg-neutral-800 text-neutral-200"
                  : "bg-white hover:text-neutral-200 hover:bg-neutral-800 text-neutral-700"
              }`}
          >
            <p className="mx-2 p-5 "> {item}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;
