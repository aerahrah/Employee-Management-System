import { useState } from "react";
import EmployeeList from "../components/employeeDashboard/employeeList";
import EmployeeInformation from "../components/employeeDashboard/employeeInformation";
import { CardFull, CardMd } from "../components/cardComponent";
const EmployeePage = () => {
  const [selectedId, setSelectedId] = useState();
  return (
    <div className="pt-26 w-[100%] bg-neutral-200 flex gap-4 p-6">
      <CardMd>
        <EmployeeList setSelectedId={setSelectedId} />
      </CardMd>
      <CardFull>
        <EmployeeInformation selectedId={selectedId} />
      </CardFull>
    </div>
  );
};

export default EmployeePage;
