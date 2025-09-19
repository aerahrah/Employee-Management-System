import { useState } from "react";

const CtoCredits = () => {
  const [formData, setFormData] = useState({
    employees: [],
    hours: "",
    memoNo: "",
    memoFile: null,
    approver: "",
  });

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  const handleEmployeeSelect = (e) => {
    const options = Array.from(
      e.target.selectedOptions,
      (option) => option.value
    );
    setFormData((prev) => ({
      ...prev,
      employees: options,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Submitted CTO Credit Request:", formData);
    // TODO: send to backend API
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Left Column - Credit CTO Form */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold mb-6 border-b pb-2">
          ➕ Credit CTO
        </h2>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Multi-select employees */}
          <div>
            <label className="block text-sm font-medium mb-1">Employees</label>
            <select
              multiple
              name="employees"
              value={formData.employees}
              onChange={handleEmployeeSelect}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-400"
            >
              <option value="juan">Juan Dela Cruz</option>
              <option value="maria">Maria Santos</option>
              <option value="pedro">Pedro Reyes</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Hold CTRL (or CMD) to select multiple
            </p>
          </div>

          {/* Hours */}
          <div>
            <label className="block text-sm font-medium mb-1">Hours</label>
            <input
              type="number"
              name="hours"
              value={formData.hours}
              onChange={handleChange}
              placeholder="Enter number of hours"
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Memo No. */}
          <div>
            <label className="block text-sm font-medium mb-1">Memo No.</label>
            <input
              type="text"
              name="memoNo"
              value={formData.memoNo}
              onChange={handleChange}
              placeholder="Enter memo number"
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Upload Memo File */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Upload Memo (PDF)
            </label>
            <input
              type="file"
              name="memoFile"
              accept="application/pdf"
              onChange={handleChange}
              className="w-full text-sm"
            />
          </div>

          {/* Approver dropdown */}
          <div>
            <label className="block text-sm font-medium mb-1">Approver</label>
            <select
              name="approver"
              value={formData.approver}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-400"
            >
              <option value="">-- Select Approver --</option>
              <option value="supervisor">Mr. Supervisor</option>
              <option value="manager">Ms. Manager</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition"
          >
            Submit Credit Request
          </button>
        </form>
      </div>

      {/* Right Column - Recent Credit History */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold mb-6 border-b pb-2">
          📜 Recent Credit History
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border rounded-md overflow-hidden">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-3 border">Employees</th>
                <th className="p-3 border">Hours</th>
                <th className="p-3 border">Memo No.</th>
                <th className="p-3 border">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-gray-50">
                <td className="p-3 border">Juan Dela Cruz, Maria Santos</td>
                <td className="p-3 border">8</td>
                <td className="p-3 border">MEMO-123</td>
                <td className="p-3 border text-yellow-600 font-medium">
                  Pending
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="p-3 border">Pedro Reyes</td>
                <td className="p-3 border">16</td>
                <td className="p-3 border">MEMO-124</td>
                <td className="p-3 border text-green-600 font-medium">
                  Approved
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="flex justify-end mt-4">
          <button className="px-4 py-2 border rounded-md text-sm hover:bg-gray-100 transition">
            View More →
          </button>
        </div>
      </div>
    </div>
  );
};

export default CtoCredits;
