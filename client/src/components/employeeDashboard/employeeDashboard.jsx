import { useState } from "react";
import EmployeeList from "./employeeList";
import EmployeeInformation from "./employeeInformation";

const EmployeeDashboard = () => {
  const [selectedId, setSelectedId] = useState();
  return (
    <div className="absolute top-[20%] bg-neutral-200 flex gap-4 p-8">
      <EmployeeList setSelectedId={setSelectedId} />
      <EmployeeInformation selectedId={selectedId} />
    </div>
  );
};

export default EmployeeDashboard;
