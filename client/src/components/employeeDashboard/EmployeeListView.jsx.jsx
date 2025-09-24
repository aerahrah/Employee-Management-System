import { useQueryClient, useMutation } from "@tanstack/react-query";
import { addEmployee } from "../../api/employee";
import { useState } from "react";
import EmployeeList from "../employeeList/employeeList";
import Modal from "../modal";
import AddEmployeeForm from "./forms/addEmployeeForm";

const EmployeeListView = ({ setSelectedId }) => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

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

  return (
    <>
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
      <EmployeeList setSelectedId={setSelectedId} />

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
    </>
  );
};

export default EmployeeListView;
