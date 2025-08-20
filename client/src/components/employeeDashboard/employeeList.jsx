import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { getEmployees, getEmployeeById } from "../../api/employee";
import { useEffect } from "react";

const EmployeeList = ({ setSelectedId }) => {
  const { data: employees } = useQuery({
    queryKey: ["employees"],
    queryFn: getEmployees,
    staleTime: Infinity,
  });

  const queryClient = useQueryClient();
  console.log(employees);

  const { mutateAsync, isPending, isSuccess, isError } = useMutation({
    mutationFn: getEmployeeById, // expects id as param
    onSuccess: (data, id) => {
      queryClient.setQueryData(["employee", id], data);
      console.log("Fetched employee:", data);
    },
  });

  const handleClick = async (id) => {
    console.log(id);
    const cached = queryClient.getQueryData(["employee", id]);
    try {
      setSelectedId(id);
      if (!cached) await mutateAsync(id);
    } catch (error) {
      console.error("Failed to fetch employee data:", error);
    }
  };

  useEffect(() => {
    if (employees?.data?.length > 0) {
      const firstId = employees.data[0]._id;

      setSelectedId(employees.data[0]._id);
      const cached = queryClient.getQueryData(["employee", firstId]);
      if (!cached) mutateAsync(firstId);
    }
  }, [employees, mutateAsync, queryClient]);
  return (
    <div className=" bg-white p-4">
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
            <li onClick={() => handleClick(item._id)} key={item._id}>
              {item.firstName}
              {item.lastName}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default EmployeeList;
