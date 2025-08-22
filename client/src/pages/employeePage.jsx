import { useState } from "react";
import EmployeeList from "../components/employeeDashboard/employeeList";
import EmployeeInformation from "../components/employeeDashboard/employeeInformation";

const EmployeePage = () => {
  const [selectedId, setSelectedId] = useState();
  return (
    <div className="absolute top-[20%] bg-neutral-200 flex gap-4 p-8">
      <EmployeeList setSelectedId={setSelectedId} />
      <EmployeeInformation selectedId={selectedId} />
    </div>
  );
};

export default EmployeePage;
