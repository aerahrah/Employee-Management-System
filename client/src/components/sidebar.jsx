import { useState } from "react";

const Sidebar = ({ admin }) => {
  console.log(admin);

  const menuItems = ["Employees", "General Settings", "Admin Management"];
  const [activeItem, setActiveItem] = useState("Employees"); // default active

  return (
    <div className="fixed h-screen bg-white w-72 l-0">
      <ul className="mt-20 flex flex-col gap-2 ">
        {menuItems.map((item) => (
          <li
            key={item}
            onClick={() => setActiveItem(item)}
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
