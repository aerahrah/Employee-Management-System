import { useState } from "react";
import { Upload } from "lucide-react";
import Select from "react-select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getEmployees } from "../../../api/employee";
import { addCreditRequest } from "../../../api/cto";

const AddCtoCreditForm = ({ onSubmit }) => {
  const queryClient = useQueryClient();

  const { data: employeesData, isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: getEmployees,
    staleTime: Infinity,
  });

  const [formData, setFormData] = useState({
    employees: [],
    hours: "",
    memoNo: "",
    memoFile: null,
    // approver: null,
  });

  const addCreditMutation = useMutation({
    mutationFn: addCreditRequest,
    onSuccess: () => {
      alert("Credit request submitted!");
      setFormData({
        employees: [],
        hours: "",
        memoNo: "",
        memoFile: null,
        // approver: null,
      });
      queryClient.invalidateQueries(["ctoCredits"]);
    },
    onError: (err) => {
      console.error(err);
      alert("Failed to submit credit request");
    },
  });

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prev) => ({ ...prev, [name]: files ? files[0] : value }));
  };

  const handleEmployeeChange = (selected) => {
    setFormData((prev) => ({
      ...prev,
      employees: selected ? selected.map((s) => s.value) : [],
    }));
  };

  // const handleApproverChange = (selected) => {
  //   setFormData((prev) => ({
  //     ...prev,
  //     approver: selected?.value || null,
  //   }));
  // };

  const handleSubmit = (e) => {
    e.preventDefault();

    const payload = {
      employees: formData.employees,
      hours: Number(formData.hours),
      memoNo: formData.memoNo,
      // approver: formData.approver,
      // can't send file in JSON
    };

    console.log("Submitting:", payload); // log payload for testing
    addCreditMutation.mutate(payload);
  };

  if (isLoading) return <div>Loading employees...</div>;

  const employeeOptions = employeesData.data.map((emp) => ({
    value: emp._id,
    label: `${emp.firstName} ${emp.lastName}`,
  }));

  return (
    <>
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2 border-b pb-2">
        ➕ Credit CTO
      </h2>
      <form className="space-y-5" onSubmit={handleSubmit}>
        {/* Employees */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Employees
          </label>
          <Select
            options={employeeOptions}
            value={employeeOptions.filter((e) =>
              formData.employees.includes(e.value)
            )}
            isMulti
            onChange={handleEmployeeChange}
            classNamePrefix="react-select"
            placeholder="Search employees..."
            classNames={{
              control: ({ isFocused }) =>
                `border rounded-md px-1 ${
                  isFocused
                    ? "border-blue-500 ring-2 ring-blue-300"
                    : "border-gray-300"
                }`,
              option: ({ isSelected, isFocused }) =>
                `${
                  isSelected
                    ? "bg-blue-600 text-white"
                    : isFocused
                    ? "bg-gray-100"
                    : "bg-white"
                } cursor-pointer px-3 py-2`,
              multiValue: () => "bg-blue-100 text-blue-900 rounded px-2 py-1",
              multiValueRemove: () =>
                "text-blue-600 hover:bg-blue-200 hover:text-blue-900 cursor-pointer px-1",
            }}
          />
        </div>

        {/* Hours */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Credit Hours
          </label>
          <input
            type="number"
            name="hours"
            value={formData.hours}
            onChange={handleChange}
            placeholder="e.g. 8"
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Memo No. */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Memo Number
          </label>
          <input
            type="text"
            name="memoNo"
            value={formData.memoNo}
            onChange={handleChange}
            placeholder="Enter memo number"
            className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Upload Memo */}
        <div className="flex gap-6 w-full">
          <div className="w-64">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Memo (PDF)
            </label>
            <div className="flex items-center gap-3">
              <label className="w-full flex items-center px-4 py-2 border rounded-md cursor-pointer bg-gray-50 hover:bg-gray-100 transition">
                <Upload className=" h-4 mr-2 text-gray-600" />
                <span className="text-sm text-gray-700">Choose File</span>
                <input
                  type="file"
                  name="memoFile"
                  accept="application/pdf"
                  onChange={handleChange}
                  className="hidden"
                />
              </label>
              {formData.memoFile && (
                <span className="text-sm text-gray-600">
                  {formData.memoFile.name}
                </span>
              )}
            </div>
          </div>
          <div className="w-full flex gap-1 flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Approved
            </label>
            <div>
              <input
                type="date"
                name="dateApproved"
                value={formData.dateApproved}
                onChange={handleChange}
                className="w-34 px-3 py-2 border rounded-md focus:ring-2 text-sm focus:ring-blue-500 focus:border-blue-500 "
              />
            </div>
          </div>
        </div>

        {/* Approver */}
        {/* <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Approver
          </label>
          <Select
            options={employeeOptions}
            value={
              employeeOptions.find((e) => e.value === formData.approver) || null
            }
            onChange={handleApproverChange}
            placeholder="Search approver..."
            classNamePrefix="react-select"
            menuPlacement="auto"
            classNames={{
              control: ({ isFocused }) =>
                `border rounded-md px-1 ${
                  isFocused
                    ? "border-blue-500 ring-2 ring-blue-300"
                    : "border-gray-300"
                }`,
              option: ({ isSelected, isFocused }) =>
                `${
                  isSelected
                    ? "bg-blue-600 text-white"
                    : isFocused
                    ? "bg-gray-100"
                    : "bg-white"
                } cursor-pointer px-3 py-2`,
              singleValue: () => "text-gray-900",
            }}
          />
        </div> */}

        {/* Submit */}
        <button
          type="submit"
          className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 active:scale-95 transition"
        >
          Submit Credit Request
        </button>
      </form>
    </>
  );
};

export default AddCtoCreditForm;
