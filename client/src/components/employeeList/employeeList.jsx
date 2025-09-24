import { useQuery } from "@tanstack/react-query";
import { getEmployees } from "../../api/employee";
import { useEffect } from "react";

const EmployeeList = ({ setSelectedId }) => {
  const {
    data: employees,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["employees"],
    queryFn: getEmployees,
    staleTime: Infinity,
  });

  // Set default selectedId when employees are loaded
  useEffect(() => {
    if (employees?.data?.length > 0 && !setSelectedId) {
      setSelectedId(employees.data[0]._id);
    }
  }, [employees, setSelectedId]);

  if (isLoading) return <div>Loading employees...</div>;
  if (isError) return <div>Failed to load employees.</div>;

  return (
    <div>
      <h1>Basic Information</h1>
      <ul className="flex flex-col gap-2 max-h-92 overflow-y-auto p-2">
        {employees?.data?.map((item) => (
          <li
            className="bg-white shadow-md p-3.5 rounded-sm cursor-pointer"
            onClick={() => setSelectedId(item._id)}
            key={item._id}
          >
            {item.firstName} {item.lastName}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default EmployeeList;
