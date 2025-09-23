import AddCtoCreditForm from "../forms/addCtoCreditForm";

const CtoCredits = () => {
  const handleFormSubmit = (data) => {
    console.log("Credit CTO submitted:", data);
    // TODO: send to backend API
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Left Column - Credit CTO Form */}
      <div className="bg-white p-6 rounded-md shadow-lg">
        <h2 className="text-xl font-semibold mb-6 border-b pb-2">
          ➕ Credit CTO
        </h2>
        <AddCtoCreditForm onSubmit={handleFormSubmit} />
      </div>

      {/* Right Column - Recent Credit History */}
      <div className="bg-white p-6 rounded-md shadow-lg">
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
