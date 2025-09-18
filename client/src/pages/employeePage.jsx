import { useState } from "react";
import EmployeeList from "../components/employeeDashboard/employeeList";
import EmployeeInformation from "../components/employeeDashboard/employeeInformation";

const EmployeePage = () => {
  const [selectedId, setSelectedId] = useState();
  return (
    <div className="pt-26 w-[100%] bg-neutral-200 flex gap-4 p-6">
      <EmployeeList setSelectedId={setSelectedId} />
      <EmployeeInformation selectedId={selectedId} />
    </div>
  );
};

export default EmployeePage;
