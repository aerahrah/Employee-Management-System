import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { getEmployees, getEmployeeById } from "../../api/employee";
import { useEffect, useState } from "react";
import Modal from "../modal";
import AddEmployeeForm from "../forms/addEmployeeForm";

const EmployeeList = ({ setSelectedId }) => {
  const { data: employees } = useQuery({
    queryKey: ["employees"],
    queryFn: getEmployees,
    staleTime: Infinity,
  });

  const queryClient = useQueryClient();
  console.log(employees);
  const [isOpen, setIsOpen] = useState(false);
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

  if (!employees?.data) {
    return <div>Loading employees...</div>;
  }

  return (
    <div className=" bg-white min-w-104 p-4">
      <div>
        <h1 className="text-xl font-semibold">Employees List</h1>
        <div className="flex gap-4">
          <button className="rounded-sm mb-3 p-2.5  bg-neutral-800 text-neutral-100">
            Download Employees List
          </button>
          <button
            onClick={() => {
              setIsOpen(true);
            }}
            className="rounded-sm mb-3 p-2.5  bg-neutral-800 text-neutral-100"
          >
            Add Employee
          </button>
        </div>

        <input
          className="w-full border-1 rounded-sm p-2.5 border-neutral-300 focus:outline-none focus:border-neutral-500"
          name="Search Employee"
          placeholder="Username"
        />
      </div>

      <div>
        <h1>Basic Information</h1>
        <ul className="flex flex-col gap-2 max-h-92 overflow-y-auto p-2">
          {employees?.data?.map((item) => (
            <li
              className="bg-white shadow-md p-3.5 rounded-sm"
              onClick={() => handleClick(item._id)}
              key={item._id}
            >
              {item.firstName} {item.lastName}
            </li>
          ))}
        </ul>
      </div>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Add Employee"
      >
        <AddEmployeeForm
          onCancel={() => setIsOpen(false)}
          onSubmit={() => {
            console.log("Employee Saved!");
            setIsOpen(false);
          }}
        />
      </Modal>
    </div>
  );
};

export default EmployeeList;
