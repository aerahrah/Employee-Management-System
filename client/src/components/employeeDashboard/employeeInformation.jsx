import { useQuery } from "@tanstack/react-query";
import { getEmployees } from "../../api/employee";

const EmployeeInformation = () => {
  const { data: employees } = useQuery({
    queryKey: ["employees"],
    queryFn: getEmployees,
    staleTime: Infinity,
  });
  console.log(employees);

  return (
    <div className="bg-white p-4">
      <div>
        <h1>Employees List</h1>
        <button>Download Employees List</button>
        <input
          className="w-full border-1 rounded-sm p-2.5 border-neutral-300 focus:outline-none focus:border-neutral-500"
          name="Search Employee"
          placeholder="Username"
        />
      </div>

      <div>
        <h1>Basic Information</h1>
        <ul>
          {employees.data.map((item) => (
            <li>
              {item.firstName}
              {item.lastName}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default EmployeeInformation;
