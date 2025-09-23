import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { getEmployees, getEmployeeById, addEmployee } from "../../api/employee";
import { useEffect, useState } from "react";
import Modal from "../modal";
import AddEmployeeForm from "./forms/addEmployeeForm";

const EmployeeList = ({ setSelectedId }) => {
  const { data: employees } = useQuery({
    queryKey: ["employees"],
    queryFn: getEmployees,
    staleTime: Infinity,
  });

  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // mutation for fetching a single employee
  const { mutateAsync: fetchEmployee } = useMutation({
    mutationFn: getEmployeeById,
    onSuccess: (data, id) => {
      queryClient.setQueryData(["employee", id], data);
    },
  });

  // mutation for adding employee
  const { mutateAsync: createEmployee, isPending: isSaving } = useMutation({
    mutationFn: addEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries(["employees"]); // refresh list
      setIsOpen(false);
    },
    onError: (err) => {
      console.error("Failed to add employee:", err);
      alert("Failed to save employee. Please try again.");
    },
  });

  const handleClick = async (id) => {
    const cached = queryClient.getQueryData(["employee", id]);
    try {
      setSelectedId(id);
      if (!cached) await fetchEmployee(id);
    } catch (error) {
      console.error("Failed to fetch employee data:", error);
    }
  };

  useEffect(() => {
    if (employees?.data?.length > 0) {
      const firstId = employees.data[0]._id;
      setSelectedId(firstId);

      const cached = queryClient.getQueryData(["employee", firstId]);
      if (!cached) fetchEmployee(firstId);
    }
  }, [employees, fetchEmployee, queryClient, setSelectedId]);

  if (!employees?.data) {
    return <div>Loading employees...</div>;
  }

  return (
    <div className="bg-white min-w-104 p-4">
      <div>
        <h1 className="text-xl font-semibold">Employees List</h1>
        <div className="flex gap-4">
          <button className="rounded-sm mb-3 p-2.5 bg-neutral-800 text-neutral-100">
            Download Employees List
          </button>
          <button
            onClick={() => setIsOpen(true)}
            className="rounded-sm mb-3 p-2.5 bg-neutral-800 text-neutral-100"
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
              className="bg-white shadow-md p-3.5 rounded-sm cursor-pointer"
              onClick={() => handleClick(item._id)}
              key={item._id}
            >
              {item.firstName} {item.lastName}
            </li>
          ))}
        </ul>
      </div>

      {/* Modal with Form */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Add Employee"
      >
        <AddEmployeeForm
          onCancel={() => setIsOpen(false)}
          onSubmit={async (data) => {
            await createEmployee(data);
          }}
        />
        {isSaving && <p className="text-sm text-gray-500 mt-2">Saving...</p>}
      </Modal>
    </div>
  );
};

export default EmployeeList;
