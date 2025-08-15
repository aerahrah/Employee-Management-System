import EmployeeList from "./employeeList";
import EmployeeInformation from "./employeeInformation";

const EmployeeDashboard = () => {
  return (
    <div className="absolute top-[20%] bg-neutral-200 flex gap-4 p-8">
      <EmployeeList />
      <EmployeeInformation />
    </div>
  );
};

export default EmployeeDashboard;
